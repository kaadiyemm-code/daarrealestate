const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized (Fadlan soo gal akoonka)' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Role ${req.user ? req.user.role : 'Guest'} is not authorized` });
    }
    next();
  };
};

// Admin only middleware
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
  }
  next();
};

// Agency and Admin only middleware
exports.isAgency = (req, res, next) => {
  if (!req.user || (req.user.role !== 'Agency' && req.user.role !== 'Admin')) {
    return res.status(403).json({ success: false, message: 'Access denied: Agency or Admin only' });
  }
  next();
};
