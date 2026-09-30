const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const Property = require('../models/Property');
const { createNotification } = require('../utils/notifyHelper');

const populateOptions = [
  { path: 'customer', select: 'name phone email avatar' },
  { path: 'provider', select: 'name phone email companyName avatar' },
  { path: 'agency', select: 'name phone email companyName avatar' },
];

// ── Admin: Get All Bookings ───────────────────────────────────────────────────
// GET /api/admin/bookings?status=&entityType=&entityId=&search=&page=&limit=
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, entityType, entityId, search, page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status && status !== 'All') query.bookingStatus = status;
    if (entityType) query.entityType = entityType;
    if (entityId) {
      if (mongoose.isValidObjectId(entityId)) {
        query.entityId = new mongoose.Types.ObjectId(entityId);
      } else {
        query.entityId = entityId;
      }
    }

    let bookings = await Booking.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .lean();

    // Apply in-memory search (filter by customer/provider name or phone)
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      bookings = bookings.filter((b) => {
        const customerMatch =
          b.customer?.name?.toLowerCase().includes(s) ||
          b.customer?.phone?.includes(s) ||
          b.customer?.email?.toLowerCase().includes(s);
        const providerMatch =
          b.provider?.name?.toLowerCase().includes(s) ||
          b.provider?.phone?.includes(s);
        const idMatch = b._id.toString().includes(s);
        return customerMatch || providerMatch || idMatch;
      });
    }

    const total = bookings.length;
    const paged = bookings.slice(skip, skip + parseInt(limit));

    // Batch fetch entity names in ONE query instead of N individual queries
    const workerIds = [];
    const propertyIds = [];

    paged.forEach((b) => {
      if (b.entityType === 'Worker' || b.entityType === 'CompanyService') {
        if (b.entityId) workerIds.push(b.entityId);
      } else if (b.entityId) {
        propertyIds.push(b.entityId);
      }
    });

    const [workers, properties] = await Promise.all([
      workerIds.length > 0 ? Worker.find({ _id: { $in: workerIds } }).select('name companyName role phone image').lean() : [],
      propertyIds.length > 0 ? Property.find({ _id: { $in: propertyIds } })
        .select('title price location category propertyType images owner assigned_agency_id')
        .populate('assigned_agency_id', 'name companyName phone email')
        .lean() : [],
    ]);

    const workerMap = new Map(workers.map((w) => [w._id.toString(), w]));
    const propertyMap = new Map(properties.map((p) => [p._id.toString(), p]));

    const enriched = paged.map((b) => {
      const entityIdStr = b.entityId ? b.entityId.toString() : '';
      let entityName = 'N/A';
      let entityObj = null;
      let agency = b.agency;

      if (b.entityType === 'Worker' || b.entityType === 'CompanyService') {
        entityObj = workerMap.get(entityIdStr) || null;
        entityName = entityObj?.companyName || entityObj?.name || 'Worker';
      } else {
        entityObj = propertyMap.get(entityIdStr) || null;
        entityName = entityObj?.title || 'Property';
        if (!agency && entityObj?.assigned_agency_id) {
          agency = entityObj.assigned_agency_id;
        }
      }

      // Flat fee — use stored appFeeAmount directly
      const computedFee = b.appFeeAmount || 0;

      return {
        ...b,
        entityName,
        property: entityObj,
        entity: entityObj,
        agency,
        appFeeAmount: computedFee,
        agencyPaymentStatus: b.agencyPaymentStatus || 'Unpaid'
      };
    });

    // Helper: get flat fee — admin sets dollar amount directly
    const getFee = (b) => b.appFeeAmount || 0;

    // Only count fees for accepted/inprogress/completed bookings
    const billedBookings = bookings.filter(b =>
      ['Accepted', 'InProgress', 'Completed'].includes(b.bookingStatus)
    );

    const stats = {
      totalBookings: bookings.length,
      acceptedCount: bookings.filter(b => b.bookingStatus === 'Accepted').length,
      completedCount: bookings.filter(b => b.bookingStatus === 'Completed').length,
      pendingCount: bookings.filter(b => b.bookingStatus === 'Pending').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      totalAppFee: billedBookings.reduce((sum, b) => sum + getFee(b), 0),
      unpaidAppFee: billedBookings
        .filter(b => b.agencyPaymentStatus !== 'Paid')
        .reduce((sum, b) => sum + getFee(b), 0),
      paidAppFee: billedBookings
        .filter(b => b.agencyPaymentStatus === 'Paid')
        .reduce((sum, b) => sum + getFee(b), 0),
    };

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ── Admin: Force Update Booking Status & App Commission Fee ──────────────────
// PUT /api/admin/bookings/:id/force-status
// Body: { bookingStatus, paymentStatus, reason, appFeeRate, appFeeAmount, agencyPaymentStatus }
exports.forceUpdateBookingStatus = async (req, res, next) => {
  try {
    const {
      bookingStatus,
      paymentStatus,
      reason,
      appFeeRate,
      appFeeAmount,
      agencyPaymentStatus
    } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ballanta lama helin' });
    }

    const prevStatus = booking.bookingStatus;

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (reason) {
      booking.cancellationReason = reason;
      booking.cancellationBy = 'Admin';
    }

    // Save rate first; then compute/save amount
    if (appFeeRate !== undefined) {
      booking.appFeeRate = Number(appFeeRate);
    }
    if (appFeeAmount !== undefined) {
      booking.appFeeAmount = Number(appFeeAmount);
    } else if (appFeeRate !== undefined) {
      // Auto-compute if only rate was provided
      booking.appFeeAmount = Math.round(((booking.totalPrice || 0) * Number(appFeeRate)) / 100);
    }
    if (agencyPaymentStatus) {
      booking.agencyPaymentStatus = agencyPaymentStatus;
    }

    await booking.save();

    // If Admin marked agency payment as Paid, notify agency
    if (agencyPaymentStatus === 'Paid') {
      const targetAgency = booking.agency || booking.provider;
      if (targetAgency) {
        await createNotification({
          title: '🎉 Lacagtii Guddiga App-ka Waa La Xaqiijiyay',
          message: `Admin-ku wuxuu xaqiijiyay in lacagtii guddiga app-ka ($${booking.appFeeAmount || 0}) ee ballanta la bixiyay (Paid)!`,
          userId: targetAgency,
          relatedId: booking._id,
        });
      }
    }

    // Notify both parties of admin action
    const adminMsg = `Admin-ku wuxuu cusboonaysiiyay ballanta: ${prevStatus} → ${bookingStatus || prevStatus}. ${reason ? `Sababta: ${reason}` : ''}`;
    await createNotification({
      title: '🔧 Maamulka: Ballan La Cusboonaysiiyay',
      message: adminMsg,
      userId: booking.customer,
      relatedId: booking._id,
    });
    if (booking.provider) {
      await createNotification({
        title: '🔧 Maamulka: Ballan La Cusboonaysiiyay',
        message: adminMsg,
        userId: booking.provider,
        relatedId: booking._id,
      });
    }

    const populated = await booking.populate(populateOptions);
    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ── Admin: Delete Booking ───────────────────────────────────────────────────
// DELETE /api/admin/bookings/:id
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ballanta lama helin' });
    }
    await booking.deleteOne();
    res.status(200).json({ success: true, message: 'Ballanta si guul leh ayaa loo tirtiray' });
  } catch (err) {
    next(err);
  }
};

