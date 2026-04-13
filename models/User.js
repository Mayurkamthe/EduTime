const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'hod'], default: 'hod' },
  department: { type: String, trim: true },
  otp: { type: String }, // hashed
  otpExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

// Hash OTP before saving
UserSchema.methods.setOTP = async function(plainOTP) {
  this.otp = await bcrypt.hash(plainOTP, 10);
  this.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

// Verify OTP
UserSchema.methods.verifyOTP = async function(plainOTP) {
  if (!this.otp || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  return await bcrypt.compare(plainOTP, this.otp);
};

// Clear OTP after use
UserSchema.methods.clearOTP = function() {
  this.otp = undefined;
  this.otpExpiry = undefined;
};

module.exports = mongoose.model('User', UserSchema);
