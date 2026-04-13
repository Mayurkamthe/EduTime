const mongoose = require('mongoose');

// A single scheduled slot
const SlotSchema = new mongoose.Schema({
  day: { type: String, required: true },
  slotIndex: { type: Number, required: true }, // position in day
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  batch: { type: String, default: null }, // null = whole class, else 'A','B','C'
  type: { type: String, enum: ['theory', 'lab', 'tutorial', 'break', 'free'] },
  isLocked: { type: Boolean, default: false }, // admin can lock slots
  // For lab slots spanning multiple periods
  isLabContinuation: { type: Boolean, default: false },
  labGroupId: { type: String, default: null } // groups continuous lab slots
});

const TimetableSchema = new mongoose.Schema({
  academicYear: { type: String, required: true },
  semester: { type: Number, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  slots: [SlotSchema],
  isGenerated: { type: Boolean, default: false },
  generatedAt: { type: Date },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index: one timetable per class per year/semester
TimetableSchema.index({ academicYear: 1, semester: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
