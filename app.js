const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settingRoutes = require('./routes/settingRoutes');
const userRoutes = require('./routes/userRoutes');
const path = require('path');

const adminRoutes = require('./routes/adminRoutes');
const agencyRoutes = require('./routes/agencyRoutes');
const workerRoutes = require('./routes/workerRoutes');
const workerCategoryRoutes = require('./routes/workerCategoryRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body Parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Health check endpoint for online deployment monitoring
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (both /api and /api/v1 supported)
app.use(['/api/auth', '/api/v1/auth'], authRoutes);
app.use(['/api/admin', '/api/v1/admin'], adminRoutes);
app.use(['/api/agency', '/api/v1/agency'], agencyRoutes);
app.use(['/api/properties', '/api/v1/properties'], propertyRoutes);
app.use(['/api/payments', '/api/v1/payments', '/api/property-bookings', '/api/v1/property-bookings'], paymentRoutes);
app.use(['/api/settings', '/api/v1/settings'], settingRoutes);
app.use(['/api/users', '/api/v1/users'], userRoutes);
app.use(['/api/workers', '/api/v1/workers'], workerRoutes);
app.use(['/api/worker-categories', '/api/v1/worker-categories'], workerCategoryRoutes);
app.use(['/api/categories', '/api/v1/categories'], categoryRoutes);
app.use(['/api/bookings', '/api/v1/bookings'], bookingRoutes);
app.use(['/api/admin-bookings', '/api/v1/admin-bookings'], adminBookingRoutes);
app.use(['/api/notifications', '/api/v1/notifications'], notificationRoutes);
app.use(['/api/upload', '/api/v1/upload'], uploadRoutes);

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

module.exports = app;
