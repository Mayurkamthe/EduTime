const Room = require('../models/Room');

exports.list = async (req, res) => {
  const rooms = await Room.find({ isActive: true }).sort('roomNumber');
  res.render('rooms/index', { title: 'Rooms', rooms });
};

exports.getCreate = (req, res) => {
  res.render('rooms/form', { title: 'Add Room', room: null, action: '/rooms' });
};

exports.postCreate = async (req, res) => {
  try {
    const { roomNumber, type, capacity, floor, building } = req.body;
    await Room.create({ roomNumber, type, capacity: parseInt(capacity), floor, building });
    req.flash('success', 'Room added.');
    res.redirect('/rooms');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Room number already exists.' : err.message);
    res.redirect('/rooms/create');
  }
};

exports.getEdit = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) { req.flash('error', 'Room not found.'); return res.redirect('/rooms'); }
  res.render('rooms/form', { title: 'Edit Room', room, action: `/rooms/${room._id}?_method=PUT` });
};

exports.putUpdate = async (req, res) => {
  try {
    const { roomNumber, type, capacity, floor, building } = req.body;
    await Room.findByIdAndUpdate(req.params.id, { roomNumber, type, capacity: parseInt(capacity), floor, building });
    req.flash('success', 'Room updated.');
    res.redirect('/rooms');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/rooms/${req.params.id}/edit`);
  }
};

exports.delete = async (req, res) => {
  await Room.findByIdAndUpdate(req.params.id, { isActive: false });
  req.flash('success', 'Room deleted.');
  res.redirect('/rooms');
};
