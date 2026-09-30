const User = require('../models/User');
const Otp = require('../models/Otp');
const Setting = require('../models/Setting');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const { buildOtpEmail } = require('../utils/emailTemplates');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client('571320561374-6cg0r0vtp84terbjs96pa0vtpumivfte.apps.googleusercontent.com');

// ── Cached branding (fetched once, updated every 10 min) ─────────────────────
let _settingCache = null;
let _settingCacheTime = 0;
async function getAppSetting() {
  const now = Date.now();
  if (_settingCache && now - _settingCacheTime < 10 * 60 * 1000) return _settingCache;
  try {
    const s = await Setting.findOne().lean();
    _settingCache = s || {};
    _settingCacheTime = now;
  } catch (_) { _settingCache = {}; }
  return _settingCache;
}

// @desc    Send Registration OTP
// @route   POST /api/auth/send-register-otp
// @access  Public
exports.sendRegisterOtp = async (req, res, next) => {
  try {
    let { email, phone } = req.body;
    
    // Check if registration is allowed
    const setting = await Setting.findOne();
    if (setting && !setting.allowRegistration) {
      return res.status(403).json({ success: false, message: 'Diiwaangalinta hadda waa la xiray. Fadlan la xiriir maamulka (Registration is currently disabled).' });
    }

    if (email) email = email.toLowerCase().trim();
    if (phone) phone = phone.trim();
    
    const identifier = email || phone;
    
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Fadlan geli email ama telefoon' });
    }

    // Check if user already exists
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });
    const existingUser = await User.findOne({ $or: orConditions });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Hore ayaa loo diiwaan galiyay (Already registered)' });
    }

    // Prevent duplicate emails — block if OTP was sent within last 60 seconds
    const recentOtp = await Otp.findOne({ identifier });
    if (recentOtp) {
      const secondsAgo = Math.floor((Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000);
      const cooldown = 60; // seconds
      if (secondsAgo < cooldown) {
        const remaining = cooldown - secondsAgo;
        return res.status(429).json({
          success: false,
          message: `Fadlan sug ${remaining} ilbiriqsi ka hor inta aadan dib u codsan (Please wait ${remaining}s before resending)`
        });
      }
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ identifier });
    await Otp.create({ identifier, code });

    // Get branding (cached)
    const s = await getAppSetting();
    const appName = s.appName || 'DAAR Real Estate';
    const logoUrl  = s.logoImage || '';

    // Send email/SMS in background (non-blocking) — respond immediately
    const recipientName = email ? email.split('@')[0] : (phone || 'Macmiil');
    const plainText = `Kusoo dhawoow ${appName}!\n\nCodkaaga xaqiijinta waa: ${code}\nCodkani wuxuu dhacayaa 10 daqiiqo kadib.`;
    const htmlMessage = buildOtpEmail({ recipientName, code, type: 'verify', expireMinutes: 10, appName, logoUrl });

    if (email) {
      sendEmail({ email, subject: `Xaqiijinta Xisaabtaada - ${appName}`, message: plainText, html: htmlMessage })
        .then(info => console.log(`✅ OTP email sent to ${email}:`, info.messageId))
        .catch(err => console.error('❌ OTP email error:', err.message));
    } else if (phone) {
      sendSMS({ phone, message: plainText })
        .catch(err => console.error('❌ OTP SMS error:', err.message));
    }

    // Respond immediately without waiting for email
    res.status(200).json({
      success: true,
      message: `Codkaaga xaqiijinta waa loo diray: ${identifier}`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    let { name, email, password, phone, role, code } = req.body;

    // Check if registration is allowed
    const setting = await Setting.findOne();
    if (setting && !setting.allowRegistration) {
      return res.status(403).json({ success: false, message: 'Diiwaangalinta hadda waa la xiray. Fadlan la xiriir maamulka (Registration is currently disabled).' });
    }

    if (email) email = email.toLowerCase().trim();
    if (phone) phone = phone.trim();

    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Fadlan geli email ama telefoon' });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Fadlan geli codka xaqiijinta (Verification code required)' });
    }

    const identifier = email || phone;

    // Verify OTP
    const otpRecord = await Otp.findOne({ identifier, code: code.toString().trim() });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Codkan waa khalad ama wuu dhacay (Invalid or expired code)' });
    }

    // Check if user already exists
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });
    const existingUser = await User.findOne({ $or: orConditions });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Hore ayaa loo diiwaan galiyay (Already registered)' });
    }

    let assignedRole = ['Customer', 'Worker', 'Agency'].includes(role) ? role : 'Customer';

    // Customers are auto-approved. Workers/Agencies need Admin approval.
    const userData = { name: (name || '').trim(), password, role: assignedRole, isApproved: assignedRole === 'Customer' };
    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    // Create user
    const user = await User.create(userData);

    // Delete OTP after successful registration
    await Otp.deleteOne({ _id: otpRecord._id });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    let { email, password } = req.body; // Can be email or phone

    // Validate email/phone and password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Fadlan geli email/telefoon iyo password' });
    }

    const identifier = email.trim();
    const cleanPass = password.trim();

    // Prepare search conditions: email (lowercase) and phone variations
    const cleanDigits = identifier.replace(/[^\d+]/g, '');
    const phoneCandidates = new Set([identifier, cleanDigits]);

    if (cleanDigits.startsWith('+252')) {
      phoneCandidates.add('0' + cleanDigits.substring(4));
      phoneCandidates.add(cleanDigits.substring(4));
      phoneCandidates.add(cleanDigits.substring(1));
    } else if (cleanDigits.startsWith('252')) {
      phoneCandidates.add('+' + cleanDigits);
      phoneCandidates.add('0' + cleanDigits.substring(3));
      phoneCandidates.add(cleanDigits.substring(3));
    } else if (cleanDigits.startsWith('0')) {
      phoneCandidates.add('+252' + cleanDigits.substring(1));
      phoneCandidates.add('252' + cleanDigits.substring(1));
      phoneCandidates.add(cleanDigits.substring(1));
    } else if (cleanDigits.length >= 7) {
      phoneCandidates.add('+252' + cleanDigits);
      phoneCandidates.add('0' + cleanDigits);
      phoneCandidates.add('252' + cleanDigits);
    }

    const orConditions = [
      { email: identifier.toLowerCase() },
      ...Array.from(phoneCandidates).filter(Boolean).map(p => ({ phone: p }))
    ];

    // Check for user
    const user = await User.findOne({ $or: orConditions }).select('+password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email/Telefoonka ama password-ka waa khalad (Invalid credentials)' });
    }

    // Check if password matches (test both exact and trimmed)
    let isMatch = await user.matchPassword(password);
    if (!isMatch && cleanPass !== password) {
      isMatch = await user.matchPassword(cleanPass);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email/Telefoonka ama password-ka waa khalad (Invalid credentials)' });
    }

    // Check if user is approved
    if (!user.isApproved && user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Xisaabtaadu waxay sugeysaa ogolaanshaha maamulka (Account pending admin approval)' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Fadlan geli idToken (No ID token provided)' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: '571320561374-6cg0r0vtp84terbjs96pa0vtpumivfte.apps.googleusercontent.com',
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Check if registration is allowed
      const setting = await Setting.findOne();
      if (setting && !setting.allowRegistration) {
        return res.status(403).json({ success: false, message: 'Diiwaangalinta hadda waa la xiray. Fadlan la xiriir maamulka (Registration is currently disabled).' });
      }

      // Generate random strong password
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10) + 'A1!';

      user = await User.create({
        name,
        email,
        password: randomPassword,
        avatar: picture,
        role: 'Customer',
        isApproved: true,
      });
    }

    // Check if user is approved
    if (!user.isApproved && user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Xisaabtaadu waxay sugeysaa ogolaanshaha maamulka (Account pending admin approval)' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ success: false, message: 'Google authentication failed (Waa diiday)' });
  }
};



// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isApproved: user.isApproved,
      savedProperties: user.savedProperties || []
    }
  });
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Fadlan geli email-ka ama telefoonka' });
    }

    const user = await User.findOne({
      $or: [ { email: email.toLowerCase() }, { phone: email } ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Isticmaalahan lama helin (User not found)' });
    }

    // Generate a 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to user
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Get branding (cached)
    const s2 = await getAppSetting();
    const appName2 = s2.appName || 'DAAR Real Estate';
    const logoUrl2  = s2.logoImage || '';

    // Send in background
    const recipientName = user.name || (user.email ? user.email.split('@')[0] : (user.phone || 'Macmiil'));
    const plainText = `Codsi dib-u-dejin password ayaa laga soo gudbiyay xisaabtaada.\n\nCodkaaga waa: ${resetCode}\nCodkani wuxuu dhacayaa 10 daqiiqo kadib.`;
    const htmlMessage = buildOtpEmail({ recipientName, code: resetCode, type: 'reset', expireMinutes: 10, appName: appName2, logoUrl: logoUrl2 });

    if (user.email) {
      sendEmail({ email: user.email, subject: `Dib-u-Dejinta Password-ka - ${appName2}`, message: plainText, html: htmlMessage })
        .then(info => console.log(`✅ Reset email sent to ${user.email}:`, info.messageId))
        .catch(err => console.error('❌ Reset email error:', err.message));
    } else if (user.phone) {
      sendSMS({ phone: user.phone, message: plainText })
        .catch(err => console.error('❌ Reset SMS error:', err.message));
    }

    res.status(200).json({ success: true, message: 'Codkaaga xaqiijinta waa loo diray (Verification code sent)' });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset Password using Code
// @route   POST /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Fadlan buuxi dhammaan xogta (Please fill all fields)' });
    }

    const user = await User.findOne({
      $or: [ { email: email.toLowerCase() }, { phone: email } ],
      resetPasswordCode: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Codkan wuu dhacay ama waa khalad (Invalid or expired code)' });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};
