const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Property = require('../models/Property');
const Entity = require('../models/Entity');
const User = require('../models/User');
const { createNotification } = require('../utils/notifyHelper');

// ── Helpers ────────────────────────────────────────────────────────────────────

const populateOptions = [
  { path: 'customer', select: 'name phone email avatar' },
  { path: 'provider', select: 'name phone email avatar' },
  { path: 'agency', select: 'name phone email avatar' },
];

/**
 * Dynamically fetch the booked entity (Worker, Property, or Entity) by entityType + entityId.
 */
async function fetchEntity(entityType, entityId) {
  if (entityType === 'Worker' || entityType === 'CompanyService') {
    return Worker.findById(entityId);
  }
  if (entityType === 'Property' || entityType === 'Hall') {
    let p = await Property.findById(entityId);
    if (!p) {
      p = await Entity.findById(entityId);
    }
    return p;
  }
  return null;
}

// ── Customer: Create Booking ──────────────────────────────────────────────────
// POST /api/bookings
exports.createBooking = async (req, res, next) => {
  try {
    const {
      entityType,
      entityId,
      provider,
      bookingDate,
      timeSlot,
      totalPrice,
      currency,
      notes,
    } = req.body;

    // Validate entity exists and is Approved
    const entity = await fetchEntity(entityType, entityId);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Shayga la doonayo lama helin (Entity not found)' });
    }
    if (entity.approvalStatus && entity.approvalStatus !== 'Approved') {
      return res.status(403).json({ success: false, message: 'Shaygan admin-ku weli ma ansixinin (Entity not yet approved)' });
    }

    // Determine target provider and agency
    let targetProvider = provider?._id || provider;
    if (!targetProvider || !mongoose.isValidObjectId(targetProvider)) {
      targetProvider = entity.agencyOwner?._id || entity.agencyOwner || entity.assigned_agency_id || entity.owner?._id || entity.owner;
    }

    let providerUser = null;
    if (targetProvider && mongoose.isValidObjectId(targetProvider)) {
      providerUser = await User.findById(targetProvider);
    }
    if (!providerUser) {
      providerUser = await User.findOne({ role: 'Admin' });
      if (providerUser) targetProvider = providerUser._id;
    }

    const agencyId = entity.agencyOwner?._id || entity.agencyOwner || entity.assigned_agency_id || (providerUser?.role === 'Agency' ? providerUser._id : null);

    const booking = await Booking.create({
      customer: req.user.id,
      entityType,
      entityId,
      provider: targetProvider,
      agency: agencyId,
      customerName: req.body.customerName || req.user.name || 'Macmiil',
      customerPhone: req.body.customerPhone || req.user.phone || '',
      customerLocation: req.body.customerLocation || '',
      idNumber: req.body.idNumber || '',
      serviceType: req.body.serviceType || '',
      bookingDate: bookingDate || new Date().toISOString().split('T')[0],
      timeSlot: timeSlot || 'Full Day',
      totalPrice: totalPrice || entity.price || entity.pricePerDay || 0,
      currency: currency || 'USD',
      notes: notes || '',
      bookingStatus: 'Pending',
      paymentStatus: 'Pending',
    });

    // Notify provider of new booking
    const entityName = entity.title || entity.name || entity.companyName || 'Adeeg';
    if (targetProvider) {
      await createNotification({
        title: '🔔 Ballan Cusub (New Booking)',
        message: `Macmiil cusub ayaa balanqaaday adeegagaaga "${entityName}". Taariikhda: ${bookingDate}.`,
        userId: targetProvider,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }

    // If there is an assigned agency different from provider, notify agency as well
    if (agencyId && agencyId.toString() !== targetProvider?.toString()) {
      await createNotification({
        title: '🔔 Ballan Cusub oo Hantidaada ah',
        message: `Macmiil ayaa ballantay hantidaada "${entityName}". Taariikhda: ${bookingDate}.`,
        userId: agencyId,
        relatedId: booking._id,
        notifyAdmins: false,
      });
    }

    const populated = await booking.populate(populateOptions);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ── Customer: Get My Bookings ─────────────────────────────────────────────────
// GET /api/bookings/my-bookings?status=Active|Completed|Cancelled
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;

    const query = { customer: req.user.id };

    if (status === 'Active') {
      query.bookingStatus = { $in: ['Pending', 'Accepted', 'InProgress'] };
    } else if (status === 'Completed') {
      query.bookingStatus = 'Completed';
    } else if (status === 'Cancelled') {
      query.bookingStatus = { $in: ['Cancelled', 'Rejected'] };
    }

    const bookings = await Booking.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 });

    // Manually populate entity details
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const obj = b.toObject();
        try {
          obj.entity = await fetchEntity(b.entityType, b.entityId);
        } catch (_) {}
        return obj;
      })
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── Customer: Cancel Booking ──────────────────────────────────────────────────
// PUT /api/bookings/:id/cancel
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ballanta lama helin' });
    }

    // Only the customer who created the booking can cancel it
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Kuma oggola inaad kansal gareyso ballantaan' });
    }

    if (booking.bookingStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Kaliya ballamaha sugaya (Pending) ayaa kansal la garayn karaa. Tan waa "${booking.bookingStatus}" mana la joojin karo. Haddii ay cillad jirto, fadlan la xiriir maamulka.`,
      });
    }

    booking.bookingStatus = 'Cancelled';
    booking.cancellationBy = 'Customer';
    booking.cancellationReason = req.body.reason || 'Macmiilku wuu kansal garey';
    await booking.save();

    // Notify provider
    await createNotification({
      title: '❌ Ballan Ayaa La Kansal Garey',
      message: `Macmiilku wuxuu kansal garey ballantii ${booking.bookingDate}.`,
      userId: booking.provider,
      relatedId: booking._id,
      notifyAdmins: false,
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// ── Provider: Get Incoming Booking Requests ──────────────────────────────────
// GET /api/bookings/provider-requests?status=Pending|Accepted|Completed
exports.getProviderBookings = async (req, res, next) => {
  try {
    const { status } = req.query;

    // Check worker profile
    const Worker = require('../models/Worker');
    const Property = require('../models/Property');
    const workerProfile = await Worker.findOne({ $or: [{ userId: req.user.id }, { registeredBy: req.user.id }] });

    // Check properties assigned to this worker or owned by user
    const assignedProperties = await Property.find({
      $or: [
        { assigned_worker_id: req.user.id },
        { assigned_agency_id: req.user.id },
        { agencyOwner: req.user.id }
      ]
    }).select('_id');
    const assignedPropIds = assignedProperties.map(p => p._id);

    const orConditions = [
      { provider: req.user.id },
      { agency: req.user.id },
    ];
    if (workerProfile) {
      orConditions.push({ entityId: workerProfile._id });
    }
    if (assignedPropIds.length > 0) {
      orConditions.push({ entityId: { $in: assignedPropIds } });
    }

    const query = { $or: orConditions };

    if (status && status !== 'All') {
      if (status === 'Active') {
        query.bookingStatus = { $in: ['Pending', 'Accepted', 'InProgress'] };
      } else {
        query.bookingStatus = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const obj = b.toObject();
        try {
          obj.entity = await fetchEntity(b.entityType, b.entityId);
        } catch (_) {}

        // Financial accounting calculations
        const totalPrice = Number(obj.totalPrice) || 0;
        const appFeeRate = Number(obj.appFeeRate !== undefined ? obj.appFeeRate : 10);
        const appFeeAmount = Number(
          obj.appFeeAmount !== undefined && obj.appFeeAmount > 0
            ? obj.appFeeAmount
            : Math.round((totalPrice * appFeeRate) / 100)
        );
        const agencyPaymentStatus = obj.agencyPaymentStatus || 'Unpaid';
        const isAppFeePaid = agencyPaymentStatus === 'Paid';
        const workerEarnings = Math.max(0, totalPrice - appFeeAmount);

        obj.totalPrice = totalPrice;
        obj.appFeeRate = appFeeRate;
        obj.appFeeAmount = appFeeAmount;
        obj.agencyPaymentStatus = agencyPaymentStatus;
        obj.isAppFeePaid = isAppFeePaid;
        obj.isAppFeeOwed = !isAppFeePaid && appFeeAmount > 0;
        obj.workerEarnings = workerEarnings;

        return obj;
      })
    );

    // Compute clear summary metrics for worker
    const validBookings = enriched.filter(b => ['Accepted', 'InProgress', 'Completed'].includes(b.bookingStatus));
    const stats = {
      totalBookings: enriched.length,
      pendingCount: enriched.filter(b => b.bookingStatus === 'Pending').length,
      completedCount: enriched.filter(b => b.bookingStatus === 'Completed').length,
      totalRevenue: enriched.reduce((s, b) => s + (b.totalPrice || 0), 0),
      workerNetEarnings: validBookings.reduce((s, b) => s + (b.workerEarnings || 0), 0),
      totalAppFee: validBookings.reduce((s, b) => s + (b.appFeeAmount || 0), 0),
      unpaidAppFee: validBookings.filter(b => !b.isAppFeePaid).reduce((s, b) => s + (b.appFeeAmount || 0), 0),
      paidAppFee: validBookings.filter(b => b.isAppFeePaid).reduce((s, b) => s + (b.appFeeAmount || 0), 0),
    };

    res.status(200).json({ success: true, count: enriched.length, stats, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── Provider: Update Booking Status ─────────────────────────────────────────
// PUT /api/bookings/:id/status
// Body: { bookingStatus: 'Accepted'|'Rejected'|'InProgress'|'Completed', cancellationReason }
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus, cancellationReason } = req.body;

    const allowed = ['Accepted', 'Rejected', 'InProgress', 'Completed'];
    if (!allowed.includes(bookingStatus)) {
      return res.status(400).json({ success: false, message: 'Heerka aan sax ahayn' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ballanta lama helin' });
    }

    // Only the assigned provider can update status (or admin)
    if (booking.provider.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Kuma oggola inaad ballanta cusboonaysiiso' });
    }

    if (bookingStatus === 'Rejected' && !cancellationReason) {
      return res.status(400).json({ success: false, message: 'Fadlan geli sababta diidmada (Rejection reason required)' });
    }

    booking.bookingStatus = bookingStatus;
    if (bookingStatus === 'Rejected') {
      booking.cancellationReason = cancellationReason;
      booking.cancellationBy = 'Provider';
    }
    await booking.save();

    // ── Notifications ──────────────────────────────────────────────────────────
    const notifyMessages = {
      Accepted: {
        title: '✅ Ballantaadii Waa La Ogolaaday',
        message: `Ballantaadii ${booking.bookingDate} bixiyaha ayaa ogolaaday. Nabad gelyo!`,
      },
      Rejected: {
        title: '❌ Ballantaadii Waa La Diidey',
        message: `Ballantaadii ${booking.bookingDate} waa la diidey. Sababta: ${cancellationReason || 'Lama sheegin'}.`,
      },
      Completed: {
        title: '🎉 Adeegga Waa La Dhammeeyay',
        message: `Adeegga ${booking.bookingDate} si guul leh ayaa loo dhammeeyay. Mahadsanid!`,
      },
      InProgress: {
        title: '🔄 Adeegga Ayaa Socda',
        message: `Adeegga aad codsatay ${booking.bookingDate} hadda wuu socdaa.`,
      },
    };

    const notif = notifyMessages[bookingStatus];
    if (notif) {
      await createNotification({
        title: notif.title,
        message: notif.message,
        userId: booking.customer,
        relatedId: booking._id,
      });
      // Also notify provider on completion
      if (bookingStatus === 'Completed') {
        await createNotification({
          title: '🎉 Adeegga Waa La Dhammeeyay',
          message: `Adeegga ${booking.bookingDate} waa la dhammeeyay. Lacagta waa soo socotaa.`,
          userId: booking.provider,
          relatedId: booking._id,
        });
      }
    }

    const populated = await booking.populate(populateOptions);
    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};
