const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  collegeName: { type: String, default: 'Engineering College' },
  departmentName: { type: String, default: 'Computer Engineering' },
  academicYear: { type: String, default: '2024-25' },
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '17:00' },
  lectureDuration: { type: Number, default: 50 }, // minutes
  labDuration: { type: Number, default: 120 }, // minutes (2 or 3 hours)
  breakStart: { type: String, default: '13:00' },
  breakEnd: { type: String, default: '13:50' },
  maxLecturesPerDay: { type: Number, default: 6 }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
