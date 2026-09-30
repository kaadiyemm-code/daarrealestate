const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create a targeted notification for a specific user, or for all admins, or app-wide.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string|null} opts.userId - target specific recipient (user, worker, company, owner)
 * @param {string|null} opts.relatedId - related booking or entity id
 * @param {boolean} opts.notifyAdmins - also send targeted copy to all admin users
 * @param {boolean} opts.isGlobal - true ONLY for app-wide system announcements (default false)
 */
async function createNotification({ title, message, userId = null, relatedId = null, notifyAdmins = false, isGlobal = false, excludeUserId = null, excludeUserIds = [] }) {
  try {
    const baseData = {
      title,
      message,
      relatedId: relatedId || undefined,
      isRead: false,
    };

    // Build the exclusion array
    const exclusions = [...excludeUserIds];
    if (excludeUserId) exclusions.push(excludeUserId);

    // 1. Deliver to specific recipient if userId provided
    if (userId && (!exclusions.some(id => id && userId.toString() === id.toString()))) {
      await Notification.create({
        ...baseData,
        userId,
        isGlobal: false,
      });
    }

    // 2. Deliver to each admin if notifyAdmins is true
    if (notifyAdmins) {
      const admins = await User.find({ role: 'Admin' }).select('_id');
      for (const admin of admins) {
        const adminIdStr = admin._id.toString();
        const isTarget = userId && adminIdStr === userId.toString();
        const isExcluded = exclusions.some(id => id && adminIdStr === id.toString());
        
        if (!isTarget && !isExcluded) {
          await Notification.create({
            ...baseData,
            userId: admin._id,
            isGlobal: false,
          });
        }
      }
    }

    // 3. App-wide announcement ONLY when explicitly flagged and no specific user/admin targeted
    if (isGlobal && !userId && !notifyAdmins) {
      await Notification.create({
        ...baseData,
        isGlobal: true,
      });
    }
  } catch (err) {
    console.error('[NotifyHelper] Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };
