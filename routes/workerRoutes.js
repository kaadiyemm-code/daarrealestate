const express = require('express');
const {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  addWorkerReview,
  toggleWorkerStatus,
  bookWorker,
  getWorkerBookings,
  getAdminWorkerBookings,
  getMyWorkerProfile,
  approveWorker,
  uploadWorkerMiddleware,
  adminCancelBooking,
  addCompanyCustomer,
  getCompanyCustomers,
  addCompanyService,
  getCompanyServices,
  removeCompanyService,
  getWorkerReceivedBookings,
  assignWorkerUser,
} = require('../controllers/workerController');
const { protect, isAdmin: admin, isAgency: requireCompany } = require('../middlewares/authMiddleware');

const router = express.Router();

// Need a middleware to optionally protect
// Let's just make it public and in the controller we check `req.user` if it exists.

router.get('/', (req, res, next) => {
  // Try to parse token if it exists without throwing error
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      User.findById(decoded.id).then(user => {
        req.user = user;
        getWorkers(req, res, next);
      }).catch(() => getWorkers(req, res, next));
    } catch(e) { getWorkers(req, res, next); }
  } else {
    getWorkers(req, res, next);
  }
});
router.post('/', protect, admin, uploadWorkerMiddleware, createWorker);

router.post('/upload', protect, require('../controllers/workerController').uploadWorkerFiles); // allow workers to upload too

router.get('/me', protect, getMyWorkerProfile);
router.get('/my-bookings', protect, require('../controllers/workerController').getCustomerWorkerBookings);
router.get('/my-received-bookings', protect, getWorkerReceivedBookings);

// Company management routes (strictly protected by requireCompany - only registered companies or admin)
router.route('/company/customers')
  .get(protect, requireCompany, getCompanyCustomers)
  .post(protect, requireCompany, addCompanyCustomer);
router.route('/company/services')
  .get(protect, requireCompany, getCompanyServices)
  .post(protect, requireCompany, addCompanyService);
router.delete('/company/services/:serviceId', protect, requireCompany, removeCompanyService);

// Specific booking routes BEFORE /:id parameterized routes to avoid routing collisions
router.get('/bookings/all', protect, admin, require('../controllers/workerController').getAllWorkerBookings);
router.patch('/bookings/:bookingId/status', protect, require('../controllers/workerController').updateBookingStatus);
router.patch('/bookings/:bookingId/cancel', protect, admin, adminCancelBooking);
router.delete('/bookings/:bookingId', protect, admin, require('../controllers/workerController').deleteWorkerBooking);

router.route('/:id')
  .get(getWorkerById)
  .put(protect, updateWorker)
  .delete(protect, admin, deleteWorker);

router.post('/:id/reviews', protect, addWorkerReview);
router.delete('/:id/reviews/:reviewId', protect, admin, require('../controllers/workerController').deleteWorkerReview);
router.patch('/:id/approve', protect, admin, approveWorker);
router.patch('/:id/status', protect, admin, toggleWorkerStatus);
router.patch('/:id/assign-user', protect, admin, assignWorkerUser);
router.post('/:id/book', protect, bookWorker);
router.get('/:id/bookings', getWorkerBookings);
router.get('/:id/admin-bookings', protect, admin, getAdminWorkerBookings);

module.exports = router;
