const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. A1, A2, B1
  studentCount: { type: Number, required: true }
}, { _id: true });

const ClassSchema = new mongoose.Schema({
  year: { type: String, enum: ['FE', 'SE', 'TE', 'BE'], required: true },
  division: { type: String, required: true, uppercase: true, trim: true },
  totalStudents: { type: Number, required: true, min: 1 },
  // subjects assigned to this class
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  // Auto-generated batches for lab
  batches: [BatchSchema],
  batchCount: { type: Number, default: 2, min: 2, max: 3 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual for display name
ClassSchema.virtual('displayName').get(function() {
  return `${this.year}-${this.division}`;
});

// Auto-generate batches before save
ClassSchema.pre('save', function(next) {
  if (this.isModified('totalStudents') || this.isModified('batchCount') || this.batches.length === 0) {
    const perBatch = Math.ceil(this.totalStudents / this.batchCount);
    this.batches = [];
    const labels = ['A', 'B', 'C'];
    for (let i = 0; i < this.batchCount; i++) {
      const count = i === this.batchCount - 1
        ? this.totalStudents - perBatch * i
        : perBatch;
      this.batches.push({ name: labels[i], studentCount: Math.max(1, count) });
    }
  }
  next();
});

module.exports = mongoose.model('Class', ClassSchema);
