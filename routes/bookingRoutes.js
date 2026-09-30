const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  getProviderBookings,
  updateBookingStatus
} = require('../controllers/bookingController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Customer routes
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.put('/:id/cancel', cancelBooking);

// Provider routes
router.get('/provider-requests', getProviderBookings);
router.put('/:id/status', updateBookingStatus);

module.exports = router;
