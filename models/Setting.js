const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  appName: {
    type: String,
    default: 'Equatorial Real Estate'
  },
  appTagline: {
    type: String,
    default: 'Find & Rent Modern Houses & Hotels in Somalia & Kenya'
  },
  splashImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
  },
  splashImages: {
    type: [String],
    default: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    ]
  },
  searchPlaceholder: {
    type: String,
    default: 'Search neighborhoods, cities...'
  },
  logoImage: {
    type: String,
    default: ''
  },
  supportEmail: {
    type: String,
    default: 'support@realestate.so'
  },
  supportPhone: {
    type: String,
    default: '+252 61 5000000'
  },
  supportWhatsappLink: {
    type: String,
    default: ''
  },
  allowWorkerRegistration: {
    type: Boolean,
    default: true
  },
  allowRegistration: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
