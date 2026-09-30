const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  entityType: {
    type: String,
    enum: ['Worker', 'CompanyService', 'Property', 'Hall'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  serviceType: {
    type: String,
    default: ''
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customerLocation: {
    type: String, // Degmada / Halka uu joogo macmiilku
    default: ''
  },
  idNumber: {
    type: String, // Lambarka Kaarka Aqoonsiga / Passport
    default: ''
  },
  bookingDate: {
    type: String, // Or Date
    required: true
  },
  timeSlot: {
    type: String,
    default: 'Day Shift'
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total Price is required']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  notes: {
    type: String,
    default: ''
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Refunded'],
    default: 'Pending'
  },
  bookingStatus: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Arrived', 'InProgress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  cancellationBy: {
    type: String,
    enum: ['Customer', 'Provider', 'Admin', 'Agency'],
  },
  appFeeRate: {
    type: Number,
    default: 10 // e.g. 10%, 20%
  },
  appFeeAmount: {
    type: Number,
    default: 0
  },
  agencyPaymentStatus: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
