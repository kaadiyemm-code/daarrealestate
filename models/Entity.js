const mongoose = require('mongoose');

const EntitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Entity title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Entity description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['WeddingHall', 'House', 'Hotel', 'Apartment'],
    required: [true, 'Entity type is required']
  },
  pricePerDay: {
    type: Number,
    default: 0
  },
  pricePerNight: {
    type: Number,
    default: 0
  },
  location: {
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  images: [{
    type: String
  }],
  agencyOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalStatus: {
    type: String,
    enum: ['Approved', 'Pending', 'Inactive'],
    default: 'Approved'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Entity', EntitySchema);
