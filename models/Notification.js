const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  target: {
    type: String,
    enum: ['all', 'user', 'worker'],
    default: 'all'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // e.g., Booking ID
  },
  isGlobal: {
    type: Boolean,
    default: false  // Only true for explicit app-wide announcements
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
