const Entity = require('../models/Entity');
const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Create a new entity (Wedding Hall, House, Hotel) and optionally assign to an agency
// @route   POST /api/admin/entities
// @access  Private (Admin)
exports.createEntity = async (req, res, next) => {
  try {
    const { title, description, type, pricePerDay, pricePerNight, location, images, agencyOwner, approvalStatus } = req.body;
    
    // Check if agencyOwner is provided and is a valid agency
    if (agencyOwner) {
      const agency = await User.findById(agencyOwner);
      if (!agency || agency.role !== 'Agency') {
        return res.status(400).json({ success: false, message: 'Invalid Agency Owner' });
      }
    }

    const entity = await Entity.create({
      title,
      description,
      type,
      pricePerDay,
      pricePerNight,
      location,
      images,
      agencyOwner: agencyOwner || null,
      approvalStatus: approvalStatus || 'Approved'
    });

    if (agencyOwner) {
      await User.findByIdAndUpdate(agencyOwner, {
        $push: { assignedEntities: entity._id }
      });
    }

    res.status(201).json({ success: true, data: entity });
  } catch (err) {
    next(err);
  }
};

// @desc    Update an existing entity
// @route   PUT /api/admin/entities/:id
// @access  Private (Admin)
exports.updateEntity = async (req, res, next) => {
  try {
    let entity = await Entity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    // Check agency owner reassignment logic
    if (req.body.agencyOwner && req.body.agencyOwner !== entity.agencyOwner?.toString()) {
      const agency = await User.findById(req.body.agencyOwner);
      if (!agency || agency.role !== 'Agency') {
        return res.status(400).json({ success: false, message: 'Invalid Agency Owner' });
      }
      
      // Remove from previous agency
      if (entity.agencyOwner) {
        await User.findByIdAndUpdate(entity.agencyOwner, {
          $pull: { assignedEntities: entity._id }
        });
      }
      // Add to new agency
      await User.findByIdAndUpdate(req.body.agencyOwner, {
        $push: { assignedEntities: entity._id }
      });
    }

    entity = await Entity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: entity });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete an entity
// @route   DELETE /api/admin/entities/:id
// @access  Private (Admin)
exports.deleteEntity = async (req, res, next) => {
  try {
    const entity = await Entity.findById(req.params.id);
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' });
    }

    // Remove from assigned agency
    if (entity.agencyOwner) {
      await User.findByIdAndUpdate(entity.agencyOwner, {
        $pull: { assignedEntities: entity._id }
      });
    }

    await entity.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Master Dashboard Analytics
// @route   GET /api/admin/master-dashboard
// @access  Private (Admin)
exports.getMasterDashboard = async (req, res, next) => {
  try {
    const totalEntities = await Entity.countDocuments();
    const totalAgencies = await User.countDocuments({ role: 'Agency' });
    const totalCustomers = await User.countDocuments({ role: 'Customer' });
    const totalBookings = await Booking.countDocuments();

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('customer', 'name email phone')
      .populate('agency', 'name email phone')
      .populate('entity', 'title type')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get agencies with counts
    const agencies = await User.find({ role: 'Agency' }).select('name email phone assignedEntities isActive');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalEntities,
          totalAgencies,
          totalCustomers,
          totalBookings
        },
        recentBookings,
        agencies
      }
    });
  } catch (err) {
    next(err);
  }
};
