const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PortfolioItemSchema = new mongoose.Schema({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    default: ''
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

const WorkerSchema = new mongoose.Schema({
  // ── Provider Type ────────────────────────────────────────────────────────────
  providerType: {
    type: String,
    enum: ['Individual', 'Company'],
    default: 'Individual'
  },

  // ── Company-specific fields ──────────────────────────────────────────────────
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  teamSize: {
    type: Number,
    default: 1
  },
  // Shatiga Ganacsiga / Commercial License / TIN
  tinOrLicenseNumber: {
    type: String,
    trim: true,
    default: ''
  },
  // Legacy field (kept for backward compatibility)
  businessLicense: {
    type: String,
    trim: true,
    default: ''
  },
  businessType: {
    type: String,
    enum: ['Real Estate', 'Logistics & Moving', 'Event Management', 'Cleaning & Maintenance', 'Security', 'Other', ''],
    default: ''
  },
  serviceType: {
    type: String,
    trim: true,
    default: ''
  },
  // Company logo image URL
  logo: {
    type: String,
    default: ''
  },
  // Shatiga Ganacsiga document image URL
  businessDocument: {
    type: String,
    default: ''
  },
  // Physical office location / landmark reference
  officeAddress: {
    type: String,
    trim: true,
    default: ''
  },

  // ── Individual Worker / Common fields ────────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Please add worker or company name'],
    trim: true
  },
  // Primary Somali phone (+25261, +25263, +25290...)
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    trim: true
  },
  primaryPhone: {
    type: String,
    trim: true,
    default: ''
  },
  secondaryPhone: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  role: {
    type: String,
    required: [true, 'Please add a role/job title'],
    trim: true
  },
  // Skill category dropdown (Somali market)
  skillCategory: {
    type: String,
    enum: ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'AC Technician', 'House Cleaner', 'Driver', 'Other', ''],
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  // Somali city enum
  city: {
    type: String,
    enum: ['Mogadishu', 'Hargeisa', 'Garowe', 'Kismayo', 'Baidoa', 'Bosaso', 'Galkacyo', 'Other', ''],
    default: 'Mogadishu'
  },
  district: {
    type: String,
    required: [true, 'Please add neighborhood/district'],
    trim: true
  },

  // ── Identity Verification (Somali market) ────────────────────────────────────
  identityType: {
    type: String,
    enum: ['NIRA / National ID', 'National ID', 'Passport', 'Guarantor Letter (Tazkiyo)', 'Other', ''],
    default: 'NIRA / National ID'
  },
  identityNumber: {
    type: String,
    trim: true,
    default: ''
  },
  // Front/back photo of ID or Passport or Guarantor letter
  identityDocument: {
    type: String,
    default: ''
  },
  // Taariikhda uu dhacayo (Expiration Date) - Admin only
  identityExpiryDate: {
    type: Date,
    default: null
  },
  // Taleefanka Damiinka (Guarantor phone)
  guarantorPhone: {
    type: String,
    trim: true,
    default: ''
  },

  // ── Rates & Experience ───────────────────────────────────────────────────────
  experienceYears: {
    type: Number,
    default: 1
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  dailyRate: {
    type: Number,
    default: 0
  },
  monthlyRate: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'SOS', 'KES'],
    default: 'USD'
  },

  // ── Profile & Bio ────────────────────────────────────────────────────────────
  bio: {
    type: String,
    default: ''
  },
  personalInfo: {
    age: { type: Number },
    gender: { type: String },
    address: { type: String, trim: true },
    education: { type: String, trim: true },
    languages: { type: [String], default: [] }
  },
  languages: { type: [String], default: [] },
  previousExperience: [{
    companyName: { type: String },
    role: { type: String },
    duration: { type: String },
    description: { type: String }
  }],
  cvFile: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  portfolio: {
    type: [PortfolioItemSchema],
    default: []
  },
  avatar: {
    type: String,
    default: ''
  },

  // ── Approval Status ──────────────────────────────────────────────────────────
  isVerified: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },

  // ── Availability ─────────────────────────────────────────────────────────────
  availability: {
    type: String,
    enum: ['Available', 'Busy', 'On Leave', 'Part-Time'],
    default: 'Available'
  },

  // ── Rating & Reviews ─────────────────────────────────────────────────────────
  rating: {
    type: Number,
    default: 5.0
  },
  reviews: {
    type: [ReviewSchema],
    default: []
  },

  // ── Ownership ────────────────────────────────────────────────────────────────
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ── Company Customer Records (added manually by company) ─────────────────────
  companyCustomers: [{
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    serviceProvided: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now }
  }],

  // ── Company Service Offerings ────────────────────────────────────────────────
  companyServices: [{
    serviceName: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Worker', WorkerSchema);
