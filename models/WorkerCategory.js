const mongoose = require('mongoose');

const WorkerCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  nameLocal: {
    type: String,
    trim: true,
    default: ''
  },
  icon: {
    type: String,
    default: 'briefcase-outline'
  },
  color: {
    type: String,
    default: '#0f766e'
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('WorkerCategory', WorkerCategorySchema);
