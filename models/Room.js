const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  type: { type: String, enum: ['classroom', 'lab'], required: true },
  capacity: { type: Number, required: true, min: 1 },
  floor: { type: String, trim: true },
  building: { type: String, trim: true },
  facilities: [{ type: String }], // e.g. projector, AC
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
