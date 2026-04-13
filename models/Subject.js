const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['theory', 'lab', 'tutorial'], required: true },
  year: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], required: true },
  semester: { type: Number, min: 1, max: 8 },
  weeklyHours: { type: Number, required: true, min: 1 },
  // For labs: how many continuous slots needed
  continuousSlots: { type: Number, default: 1 },
  preferredSlots: [{ type: String }], // e.g. ['morning', 'afternoon']
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);
