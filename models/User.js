const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    sparse: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Agency', 'Worker', 'Customer', 'Company', 'Agent'],
    default: 'Customer'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ''
  },
  savedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  savedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  assignedEntities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  agencyProfile: {
    companyName: { type: String, trim: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    businessLicense: { type: String, trim: true },
    isRegistered: { type: Boolean, default: false }
  },
  resetPasswordCode: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
