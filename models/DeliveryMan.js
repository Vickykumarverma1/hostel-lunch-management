const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryManSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  colleges: [{ type: String }]
}, { timestamps: true });

deliveryManSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

deliveryManSchema.methods.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('DeliveryMan', deliveryManSchema);
