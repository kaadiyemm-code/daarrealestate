const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    default: 'home-outline'
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Property', 'Worker'],
    default: 'Property'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', CategorySchema);
