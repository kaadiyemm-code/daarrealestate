const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get notifications for logged in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Only show notifications for this user OR true global announcements (no userId attached)
    const notifications = await Notification.find({
      $or: [
        { userId: userId },
        { isGlobal: true, userId: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    notification.isRead = true;
    await notification.save();
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error updating notification' });
  }
};

// @desc    Mark all notifications as read for logged in user
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      {
        $or: [
          { userId: userId },
          { isGlobal: true, userId: { $exists: false } }
        ],
        isRead: false
      },
      { isRead: true }
    );
    res.status(200).json({ success: true, message: 'Dhamaan ogeysiisyada waa la akhristay' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error marking all read' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Ogeysiiska waa la tirtirtay' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
};

// @desc    Create a new notification (Admin only)
//          Can send to all users (isGlobal=true) or to a specific userId
// @route   POST /api/notifications
// @access  Private (Admin)
exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, targetUserId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Fadlan geli ciwaan iyo fariin' });
    }

    if (targetUserId) {
      // Send to a specific user
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Isticmaalaha lama helin' });
      }
      const notification = await Notification.create({
        title,
        message,
        userId: targetUserId,
        isGlobal: false,
        isRead: false,
      });
      return res.status(201).json({ success: true, data: notification });
    }

    // Send to everyone (true global announcement)
    const notification = await Notification.create({
      title,
      message,
      isGlobal: true,
      isRead: false,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error creating notification' });
  }
};

// @desc    Get all users list for admin (to send targeted notifications)
// @route   GET /api/notifications/users
// @access  Private (Admin)
exports.getUsersForNotification = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(query).select('_id name email role').limit(50);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};
