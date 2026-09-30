const express = require('express');
const router = express.Router();
const { protect, isAdmin, authorize } = require('../middlewares/authMiddleware');
const {
  createEntity,
  updateEntity,
  deleteEntity,
  getMasterDashboard
} = require('../controllers/adminController');
const {
  getAllBookings,
  forceUpdateBookingStatus,
  deleteBooking
} = require('../controllers/adminBookingController');
const {
  getPendingEntities,
  approveEntity,
  rejectEntity
} = require('../controllers/adminApprovalController');

const User = require('../models/User');

// All admin routes require auth + admin role
router.use(protect);
router.use(isAdmin);

// ── Agencies List ─────────────────────────────────────────────────────────────
router.get('/agencies', async (req, res, next) => {
  try {
    const agencies = await User.find({ role: 'Agency', isActive: true }).select('name email phone assignedEntities');
    res.status(200).json({ success: true, count: agencies.length, data: agencies });
  } catch (err) {
    next(err);
  }
});

// ── Entity CRUD ───────────────────────────────────────────────────────────────
router.route('/entities')
  .post(createEntity);

router.route('/entities/:id')
  .put(updateEntity)
  .delete(deleteEntity);

// ── Master Dashboard ──────────────────────────────────────────────────────────
router.get('/master-dashboard', getMasterDashboard);

// ── Admin Bookings ────────────────────────────────────────────────────────────
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/force-status', forceUpdateBookingStatus);
router.delete('/bookings/:id', deleteBooking);

// ── Approval Queue ────────────────────────────────────────────────────────────
router.get('/pending-entities', getPendingEntities);
router.put('/approve-entity/:type/:id', approveEntity);
router.put('/reject-entity/:type/:id', rejectEntity);

module.exports = router;
