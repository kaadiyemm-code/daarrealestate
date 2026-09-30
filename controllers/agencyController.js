const Entity = require('../models/Entity');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { createNotification } = require('../utils/notifyHelper');

// Helper to get all assigned property and entity IDs for an agency user
async function getAssignedEntityIds(agencyUserId) {
  const [properties, entities] = await Promise.all([
    Property.find({
      $or: [
        { owner: agencyUserId },
        { agencyOwner: agencyUserId },
        { assigned_agency_id: agencyUserId }
      ]
    }).select('_id'),
    Entity.find({ agencyOwner: agencyUserId }).select('_id')
  ]);

  return [
    ...properties.map(p => p._id),
    ...entities.map(e => e._id)
  ];
}

// @desc    Get real-time summary for logged-in agency
// @route   GET /api/agency/dashboard or /api/v1/agency/dashboard
// @access  Private (Agency/Admin)
exports.getAgencyDashboard = async (req, res, next) => {
  try {
    const assignedIds = await getAssignedEntityIds(req.user._id);

    const bookingFilter = {
      $or: [
        { agency: req.user._id },
        { provider: req.user._id },
        { entityId: { $in: assignedIds } }
      ]
    };

    const [
      properties,
      entities,
      pendingBookingsCount,
      activeBookingsCount,
      acceptedAndCompletedBookings
    ] = await Promise.all([
      Property.find({
        $or: [
          { owner: req.user._id },
          { agencyOwner: req.user._id },
          { assigned_agency_id: req.user._id }
        ]
      })
      .select('title propertyType listingType category location approvalStatus status price priceUnit currency floorInfo hallDetails hotelDetails images')
      .lean(),
      Entity.find({ agencyOwner: req.user._id }).select('title type location approvalStatus pricePerDay images').lean(),
      Booking.countDocuments({ ...bookingFilter, bookingStatus: 'Pending' }),
      Booking.countDocuments({ ...bookingFilter, bookingStatus: { $in: ['Accepted', 'InProgress'] } }),
      Booking.find({ ...bookingFilter, bookingStatus: { $in: ['Accepted', 'InProgress', 'Completed'] } }).lean()
    ]);

    const acceptedCount = acceptedAndCompletedBookings.filter(b => b.bookingStatus === 'Accepted').length;
    const completedCount = acceptedAndCompletedBookings.filter(b => b.bookingStatus === 'Completed').length;
    const acceptedOrCompletedCount = acceptedAndCompletedBookings.length;

    // Total agreed amount across all accepted & completed
    const totalEarnings = acceptedAndCompletedBookings.reduce(
      (acc, b) => acc + (b.totalPrice || b.totalAmount || 0), 0
    );

    // Flat fee — use stored appFeeAmount directly
    const getFee = (b) => b.appFeeAmount || 0;

    const pendingAppFeeTotal = acceptedAndCompletedBookings
      .filter(b => b.agencyPaymentStatus !== 'Paid')
      .reduce((acc, b) => acc + getFee(b), 0);

    const paidAppFeeTotal = acceptedAndCompletedBookings
      .filter(b => b.agencyPaymentStatus === 'Paid')
      .reduce((acc, b) => acc + getFee(b), 0);

    const totalAppFee = pendingAppFeeTotal + paidAppFeeTotal;
    const netEarnings = Math.max(0, totalEarnings - totalAppFee);

    // Format unified portfolio list
    const formattedProps = properties.map(p => ({
      _id: p._id,
      title: p.title,
      type: p.propertyType || p.listingType || p.category || 'Property',
      listingType: p.listingType,
      category: p.category,
      location: { city: p.location?.address || 'N/A' },
      approvalStatus: p.approvalStatus,
      status: p.status || 'Available',
      price: p.price,
      priceUnit: p.priceUnit || 'per month',
      currency: p.currency || 'USD',
      floorInfo: p.floorInfo,
      hallDetails: p.hallDetails,
      hotelDetails: p.hotelDetails,
      images: p.images || []
    }));

    const formattedEntities = entities.map(e => ({
      _id: e._id,
      title: e.title,
      type: e.type || 'Entity',
      location: e.location || { city: 'N/A' },
      approvalStatus: e.approvalStatus,
      status: 'Available',
      price: e.pricePerDay || 0,
      priceUnit: 'per day',
      currency: 'USD',
      images: e.images || []
    }));

    const assignedEntities = [...formattedProps, ...formattedEntities];

    res.status(200).json({
      success: true,
      data: {
        assignedEntitiesCount: assignedEntities.length,
        pendingBookingsCount,
        activeBookingsCount,
        acceptedBookingsCount: acceptedCount,
        completedBookingsCount: completedCount,
        acceptedOrCompletedCount,
        totalEarnings,
        pendingAppFeeTotal,
        paidAppFeeTotal,
        totalAppFee,
        netEarnings,
        assignedEntities
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Fetch bookings filtered strictly by logged-in agency
// @route   GET /api/agency/bookings or /api/v1/agency/bookings
// @access  Private (Agency/Admin)
exports.getAgencyBookings = async (req, res, next) => {
  try {
    const assignedIds = await getAssignedEntityIds(req.user._id);

    const bookingFilter = {
      $or: [
        { agency: req.user._id },
        { provider: req.user._id },
        { entityId: { $in: assignedIds } }
      ]
    };

    const bookings = await Booking.find(bookingFilter)
      .populate('customer', 'name phone email avatar')
      .populate('provider', 'name phone email avatar companyName')
      .populate('agency', 'name phone email companyName')
      .sort({ createdAt: -1 })
      .lean();

    // Batch fetch entities
    const workerIds = [];
    const propertyIds = [];

    bookings.forEach((b) => {
      if (b.entityType === 'Worker' || b.entityType === 'CompanyService') {
        if (b.entityId) workerIds.push(b.entityId);
      } else if (b.entityId) {
        propertyIds.push(b.entityId);
      }
    });

    const [workers, properties, entities] = await Promise.all([
      workerIds.length > 0 ? Worker.find({ _id: { $in: workerIds } }).select('name companyName role phone image').lean() : [],
      propertyIds.length > 0 ? Property.find({ _id: { $in: propertyIds } }).select('title propertyType listingType location price images status').lean() : [],
      propertyIds.length > 0 ? Entity.find({ _id: { $in: propertyIds } }).select('title type location pricePerDay images').lean() : []
    ]);

    const workerMap = new Map(workers.map(w => [w._id.toString(), w]));
    const propertyMap = new Map(properties.map(p => [p._id.toString(), p]));
    const entityMap = new Map(entities.map(e => [e._id.toString(), e]));

    const enriched = bookings.map((b) => {
      const entityIdStr = b.entityId ? b.entityId.toString() : '';
      let entity = null;
      let entityName = 'N/A';

      if (b.entityType === 'Worker' || b.entityType === 'CompanyService') {
        entity = workerMap.get(entityIdStr) || null;
        entityName = entity?.companyName || entity?.name || 'Worker';
      } else {
        entity = propertyMap.get(entityIdStr) || entityMap.get(entityIdStr) || null;
        entityName = entity?.title || 'Property';
      }

      // Privacy Protection: Milkiilaha (Agency) cannot see customer's phone or national ID
      // Only Admin has direct access to call customer
      const safeCustomer = b.customer ? {
        _id: b.customer._id,
        name: b.customer.name,
        avatar: b.customer.avatar,
        phone: '🔒 Qarsoon (Admin Kaliya)'
      } : null;

      // Flat fee — use stored appFeeAmount directly
      const feeAmount = b.appFeeAmount || 0;

      return {
        ...b,
        customer: safeCustomer,
        customerPhone: '🔒 Qarsoon (Admin Kaliya)',
        idNumber: '🔒 Qarsoon (Admin Kaliya)',
        totalAmount: b.totalPrice || b.totalAmount || 0,
        entity,
        property: entity,
        propertyId: entity,
        entityName,
        appFeeAmount: feeAmount,
        agencyPaymentStatus: b.agencyPaymentStatus || 'Unpaid'
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update booking status (Accept/Reject/Complete)
// @route   PUT /api/agency/bookings/:id/status
// @access  Private (Agency/Admin)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus, rejectionReason, totalPrice, appFeeAmount, notes } = req.body;

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const assignedIds = await getAssignedEntityIds(req.user._id);
    const isAssigned =
      (booking.agency && booking.agency.toString() === req.user._id.toString()) ||
      (booking.provider && booking.provider.toString() === req.user._id.toString()) ||
      assignedIds.some(id => id.toString() === booking.entityId.toString()) ||
      req.user.role === 'Admin';

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
    }

    booking.bookingStatus = bookingStatus;
    if (bookingStatus === 'Accepted') {
      if (totalPrice !== undefined && Number(totalPrice) > 0) {
        booking.totalPrice = Number(totalPrice);
      }
      if (appFeeAmount !== undefined && Number(appFeeAmount) >= 0) {
        booking.appFeeAmount = Number(appFeeAmount);
      } else if (!booking.appFeeAmount) {
        booking.appFeeAmount = 10; // Default $10
      }
      booking.agencyPaymentStatus = booking.agencyPaymentStatus || 'Unpaid';
      if (notes) {
        booking.notes = (booking.notes ? booking.notes + ' | ' : '') + notes;
      }
    }
    if (bookingStatus === 'Rejected') {
      booking.rejectionReason = rejectionReason || 'Hantidu wakhtigan ma bannaana';
      booking.cancellationReason = rejectionReason || 'Hantidu wakhtigan ma bannaana';
      booking.cancellationBy = 'Agency';
    }

    await booking.save();

    // Send targeted notification to customer
    if (booking.customer) {
      const reasonSuffix = rejectionReason ? ` Sababta: "${rejectionReason}".` : '';
      const notifTitle = bookingStatus === 'Accepted'
        ? '✅ Dalabkaagii Waa La Ogolaaday'
        : bookingStatus === 'Rejected'
        ? '❌ Dalabkaagii Waa La Diidey'
        : `📢 Xaaladda Dalabka: ${bookingStatus}`;

      const notifMsg = bookingStatus === 'Accepted'
        ? `Wakaaladda ayaa ogolaatay dalabkaagii hantida. Qiimaha lagu heshiiyay waa $${booking.totalPrice}. Admin-ka ayaa kula soo xiriiri doona.`
        : bookingStatus === 'Rejected'
        ? `Wakaaladda/Milkiilaha ayaa diiday dalabkaagii.${reasonSuffix} Wixii faahfaahin dheeraad ah fadlan la xiriir Admin-ka.`
        : `Xaaladda dalabkaaga waxaa loo beddelay "${bookingStatus}".`;

      await createNotification({
        title: notifTitle,
        message: notifMsg,
        userId: booking.customer,
        relatedId: booking._id,
        notifyAdmins: false
      });
    }

    // Also notify admins if agency rejected or accepted
    await createNotification({
      title: `🏢 Wakaalad: Dalab ${bookingStatus === 'Accepted' ? 'Waa La Ogolaaday' : 'Waa La Diidey'}`,
      message: `Wakaaladdu waxay ${bookingStatus === 'Accepted' ? `ogolaatay ballanta ID: ${booking._id}. Qiimaha guriga: $${booking.totalPrice}, Guddiga App-ka: $${booking.appFeeAmount}.` : `diiday ballanta ID: ${booking._id}.${rejectionReason ? ` Sababta: "${rejectionReason}"` : ''}`}`,
      relatedId: booking._id,
      notifyAdmins: true
    });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};
