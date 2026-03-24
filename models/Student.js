const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  college: { type: String, required: true },
  roomNumber: { type: String, required: true },
  lunchTime: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
