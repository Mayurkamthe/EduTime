const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'hod'], default: 'hod' },
  department: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Verify password
UserSchema.methods.verifyPassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
