const Setting = require('../models/Setting');

exports.getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, { new: true, runValidators: true });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
};
