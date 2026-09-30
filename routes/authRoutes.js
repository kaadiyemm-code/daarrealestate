const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, forgotPassword, resetPassword, sendRegisterOtp, googleAuth } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rate limiting for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 min per IP (enough for testing + real use)
  message: { success: false, message: 'Codsiyaad aad badan ayaad u dirtay. Fadlan sug 15 daqiiqo.' }
});

router.post('/send-register-otp', authLimiter, sendRegisterOtp);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.post('/resetpassword', authLimiter, resetPassword);
router.post('/google', authLimiter, googleAuth);
router.get('/me', protect, getMe);

module.exports = router;
