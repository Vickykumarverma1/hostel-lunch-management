const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  college: { type: String, required: true },
  status: { type: String, enum: ['booked', 'delivered', 'returned'], default: 'booked' },
  deliveredAt: { type: Date, default: null },
  returnedAt: { type: Date, default: null },
  deliveryManId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryMan', default: null },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'DeskOperator', default: null }
}, { timestamps: true });

// Ensure one booking per student per day
bookingSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
