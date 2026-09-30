const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  propertyType: {
    type: String,
    default: 'House'
  },
  listingType: {
    type: String,
    enum: ['Rent', 'Sale', 'Hotel', 'Wedding Hall'],
    default: 'Rent'
  },
  category: {
    type: String,
    default: 'Rent'
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  priceUnit: {
    type: String,
    default: 'per month' // 'per month', 'total price', 'per night', 'per event'
  },
  serverFee: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'KES', 'SOS'],
    default: 'USD'
  },
  images: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Rented', 'Booked'],
    default: 'Available'
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
  customDetails: [{
    key: { type: String, trim: true },
    value: { type: String, trim: true }
  }],
  terms: [{
    type: String,
    trim: true
  }],
  location: {
    // GeoJSON Point
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    address: {
      type: String,
      required: true
    }
  },
  features: {
    hasWifi: { type: Boolean, default: false },
    hasBalcony: { type: Boolean, default: false },
    hasAC: { type: Boolean, default: false },
    hasParking: { type: Boolean, default: false },
    hasPool: { type: Boolean, default: false },
    hasGym: { type: Boolean, default: false },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    sqft: { type: Number, default: 0 },
    amenities: { type: [String], default: [] }
  },
  hotelDetails: {
    roomType: { type: String, default: 'Standard' }, // Single, Double, Suite
    bedType: { type: String, default: '1 King Bed' },
    maxGuests: { type: Number, default: 2 },
    starRating: { type: Number, default: 3, min: 1, max: 5 },
    hasBreakfast: { type: Boolean, default: false },
    hasRoomService: { type: Boolean, default: false },
    hasReception24h: { type: Boolean, default: false }
  },
  floorInfo: {
    isBuilding: { type: Boolean, default: false }, // Dabaq ma yahay?
    totalFloors: { type: Number, default: 1 },     // Dabaqyo meeqa ah
    floorNumber: { type: Number, default: 0 },     // Dabaqa imisaad ayuu ku yaal (haddii guri kiraysan yahay)
    apartmentNumber: { type: String, default: '' }, // Lambarka guriga/flat-ka
    hasElevator: { type: Boolean, default: false } // Wiish ma leeyahay
  },
  hallDetails: {
    capacity: { type: Number, default: 0 }, // Inta qof uu qaado
    hasCatering: { type: Boolean, default: false }, // Cunto ma leeyahay
    cateringDetails: { type: String, default: '' }, // Faahfaahinta cuntada
    hasWaiters: { type: Boolean, default: false }, // Adeegayaal / Servers ma leeyahay
    hasStage: { type: Boolean, default: false }, // Masrax / Stage
    hasSoundSystem: { type: Boolean, default: false }, // Codka & Sound
    hasProjector: { type: Boolean, default: false }, // Screen / Projector
    hasDecorations: { type: Boolean, default: false } // Qurxinta Arooska
  },
  reviews: [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userAvatar: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: {
    type: Number,
    default: 5.0
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  agencyOwner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  assigned_agency_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  assigned_worker_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Property', PropertySchema);
