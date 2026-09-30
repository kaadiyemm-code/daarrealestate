const Transaction = require('../models/Transaction');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notifyHelper');

// @desc    Initiate mobile money payment (USSD Push Blueprint)
// @route   POST /api/payments/initiate
// @access  Private
exports.initiatePayment = async (req, res, next) => {
  try {
    const {
      propertyId,
      amount,
      phone,
      provider,
      checkIn,
      checkOut,
      guests,
      customerName,
      customerLocation,
      idNumber,
      specialRequests
    } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const cleanProvider = (provider || 'EVC Plus').toUpperCase().replace(/[\s-]/g, '_');
    const validProvider = ['EVC_PLUS', 'ZAAD', 'M_PESA'].includes(cleanProvider) ? cleanProvider : 'EVC_PLUS';

    const transaction = await Transaction.create({
      user: req.user.id,
      property: propertyId,
      amount,
      phone: phone || req.user.phone || '',
      provider: validProvider,
      transactionId: `TXN${Math.floor(100000 + Math.random() * 900000)}`,
      checkIn,
      checkOut,
      guests: guests || 1,
      customerName: customerName || req.user.name || '',
      customerLocation: customerLocation || '',
      idNumber: idNumber || '',
      status: 'Pending'
    });

    // Also register in central Booking system so Agency, Admin, and Customer dashboards reflect it
    const agencyId = property.assigned_agency_id || property.agencyOwner || null;
    const providerId = agencyId || property.owner || null;

    const booking = await Booking.create({
      customer: req.user.id,
      entityType: property.category === 'Wedding Hall' ? 'Hall' : 'Property',
      entityId: propertyId,
      provider: providerId,
      agency: agencyId,
      customerName: customerName || req.user.name || 'Macmiil',
      customerPhone: phone || req.user.phone || '',
      customerLocation: customerLocation || '',
      idNumber: idNumber || '',
      bookingDate: checkIn || new Date().toISOString().split('T')[0],
      timeSlot: checkOut ? `${checkIn} ilaa ${checkOut}` : 'Full Stay',
      totalPrice: amount || property.price || 0,
      currency: property.currency || 'USD',
      notes: specialRequests || `Txn: ${transaction.transactionId} | Martida: ${guests || 1}`,
      bookingStatus: 'Pending',
      paymentStatus: 'Pending'
    });

    res.status(200).json({
      success: true,
      message: 'Booking & payment request submitted successfully!',
      transactionId: transaction.transactionId,
      data: transaction,
      bookingId: booking._id
    });

    // Notify the booking user
    await createNotification({
      title: '🏠 Booking Cusub Waa La Diray!',
      message: `Booking-gaagii: "${property.title}" si guul leh ayaa loo diray. Taariikhda: ${checkIn || 'Hadda'}. Admin ayaa kula soo xiriiri doona.`,
      userId: req.user.id,
      relatedId: booking._id,
      notifyAdmins: true,
    });

    // Notify Agency if property has an assigned agency
    if (agencyId) {
      await createNotification({
        title: '🔔 Dalab Cusub oo Hantidaada ah',
        message: `Macmiil ayaa ballansaday hantidaada: "${property.title}". Admin ayaa kula soo xiriiri doona si xaquuqda loo ilaaliyo.`,
        userId: agencyId,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Webhook for mobile money payment updates
// @route   POST /api/payments/webhook
// @access  Public
exports.paymentWebhook = async (req, res, next) => {
  try {
    const { transactionId, status, providerTransactionId } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    transaction.status = status === 'SUCCESS' ? 'Completed' : 'Failed';
    transaction.transactionId = providerTransactionId || transaction.transactionId;
    await transaction.save();

    if (transaction.status === 'Completed') {
      const property = await Property.findById(transaction.property);
      if (property) {
        property.status = property.category === 'Hotel Booking' ? 'Booked' : 'Rented';
        await property.save();
      }
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (err) {
    next(err);
  }
};

// @desc    Check payment status
// @route   GET /api/payments/:id/status
// @access  Private
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('property', 'title price location category propertyType images');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

// @desc    Get transactions (Admin gets all, Users get their own bookings)
// @route   GET /api/payments/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    // Auto-reject pending transactions older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredPending = await Transaction.find({
      status: 'Pending',
      createdAt: { $lt: twentyFourHoursAgo }
    });

    for (const exp of expiredPending) {
      exp.status = 'Rejected';
      await exp.save();
    }

    let query = {};
    if (req.user.role !== 'Admin') {
      query.user = req.user.id;
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'name email phone')
      .populate('property', 'title price location category propertyType images')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transaction status (Accept / Reject)
// @route   PUT /api/payments/:id/status
// @access  Private (Admin/Owner)
exports.updateTransactionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const transaction = await Transaction.findById(req.params.id).populate('property');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    transaction.status = status;
    await transaction.save();

    if (status === 'Cancelled' || status === 'Rejected' || status === 'Failed') {
      if (transaction.property) {
        transaction.property.status = 'Available';
        await transaction.property.save();
      }
    } else if (status === 'Completed') {
      if (transaction.property) {
        transaction.property.status = transaction.property.category === 'Hotel Booking' ? 'Booked' : 'Rented';
        await transaction.property.save();
      }
    }

    // Notify booking user
    const statusLabelMap = {
      Completed: '✅ Booking Waa La Xaqiijiyay!',
      Rejected: '❌ Booking Waa La Diidday',
      Cancelled: '🚫 Booking Waa La Joojiyay',
    };
    const msgMap = {
      Completed: `Booking-gaagii guriga ayaa la xaqiijiyay. Mahadsanid!`,
      Rejected: `Booking-gaagii guriga ayaa la diidday. Fadlan xiriir admin.`,
      Cancelled: `Booking-gaagii guriga ayaa la joojiyay.`,
    };
    if (statusLabelMap[status] && transaction.user) {
      const populatedT = await transaction.populate('user', '_id');
      await createNotification({
        title: statusLabelMap[status],
        message: msgMap[status] || `Xaaladda booking waa: ${status}.`,
        userId: populatedT.user?._id || transaction.user,
        relatedId: transaction._id,
        notifyAdmins: false,
      });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete transaction / cancel booking
// @route   DELETE /api/payments/:id
// @access  Private
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Booking transaction not found' });
    }

    // Free up property if reserved
    if (transaction.property) {
      const property = await Property.findById(transaction.property);
      if (property && property.status !== 'Available') {
        property.status = 'Available';
        await property.save();
      }
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Booking transaction cancelled & deleted successfully' });
  } catch (err) {
    next(err);
  }
};
