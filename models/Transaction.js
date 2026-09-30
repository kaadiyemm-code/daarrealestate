const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.ObjectId,
    ref: 'Property',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  phone: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    enum: ['EVC_PLUS', 'ZAAD', 'M_PESA'],
    required: true
  },
  transactionId: {
    type: String
  },
  checkIn: {
    type: String
  },
  checkOut: {
    type: String
  },
  guests: {
    type: Number,
    default: 1
  },
  customerName: {
    type: String,
    default: ''
  },
  customerLocation: {
    type: String,
    default: ''
  },
  idNumber: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled', 'Rejected'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
