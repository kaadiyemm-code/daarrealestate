const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getAllBookings,
  forceUpdateBookingStatus
} = require('../controllers/adminBookingController');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin')); // Only admin can access

router.get('/', getAllBookings);
router.put('/:id/force-status', forceUpdateBookingStatus);

module.exports = router;
