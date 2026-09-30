const express = require('express');
const router = express.Router();
const { protect, isAgency } = require('../middlewares/authMiddleware');
const {
  getAgencyDashboard,
  getAgencyBookings,
  updateBookingStatus
} = require('../controllers/agencyController');

router.use(protect);
router.use(isAgency);

router.get('/dashboard', getAgencyDashboard);
router.get('/bookings', getAgencyBookings);
router.put('/bookings/:id/status', updateBookingStatus);

module.exports = router;
