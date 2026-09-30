const express = require('express');
const router = express.Router();
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUsersForNotification
} = require('../controllers/notificationController');
const { protect, isAdmin: admin } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getNotifications)
  .post(protect, admin, createNotification);

router.put('/read-all', protect, markAllAsRead);
router.get('/users', protect, admin, getUsersForNotification);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
