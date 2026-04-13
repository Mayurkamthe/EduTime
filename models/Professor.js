const mongoose = require('mongoose');

const ProfessorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  employeeId: { type: String, trim: true },
  department: { type: String, trim: true },
  // Subjects this professor can teach
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  maxLecturesPerDay: { type: Number, default: 4 },
  // Availability: days and slot preferences
  availability: {
    days: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    preferredSlots: [{ type: String }] // optional slot time preferences
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Professor', ProfessorSchema);
