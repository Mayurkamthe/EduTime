const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Professor = require('../models/Professor');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const TimetableGenerator = require('../services/timetableGenerator');
const { generateDaySlots } = require('../services/slotEngine');

// GET /timetable
exports.index = async (req, res) => {
  const classes = await Class.find({ isActive: true }).sort('year division');
  const timetables = await Timetable.find({ isGenerated: true }).populate('class', 'year division');
  res.render('timetable/index', { title: 'Timetables', classes, timetables });
};

// POST /timetable/generate
exports.generate = async (req, res) => {
  try {
    const { classId, semester, academicYear, regenerate } = req.body;

    const [classDoc, settings] = await Promise.all([
      Class.findById(classId).populate('subjects'),
      Settings.findOne()
    ]);
    if (!classDoc) { req.flash('error', 'Class not found.'); return res.redirect('/timetable'); }
    if (!settings) { req.flash('error', 'Configure settings first.'); return res.redirect('/settings'); }
    if (!classDoc.subjects.length) { req.flash('error', 'No subjects assigned to this class.'); return res.redirect('/timetable'); }

    // Check for existing (unless regenerating)
    if (!regenerate) {
      const existing = await Timetable.findOne({ class: classId, semester, academicYear });
      if (existing) {
        req.flash('error', 'Timetable already exists. Use Regenerate option.');
        return res.redirect('/timetable');
      }
    }

    const [professors, rooms, otherTimetables] = await Promise.all([
      Professor.find({ isActive: true }).populate('subjects', '_id'),
      Room.find({ isActive: true }),
      Timetable.find({ isGenerated: true, class: { $ne: classId } })
    ]);

    const generator = new TimetableGenerator(settings, classDoc, classDoc.subjects, professors, rooms, otherTimetables);
    const slots = generator.generate();
    const conflicts = generator.validateResult();

    // Save timetable
    const filter = { class: classId, semester: parseInt(semester), academicYear };
    const update = {
      slots,
      isGenerated: true,
      generatedAt: new Date(),
      generatedBy: req.session.user._id,
      ...filter
    };

    await Timetable.findOneAndUpdate(filter, update, { upsert: true, new: true });

    if (conflicts.length) {
      req.flash('error', `Timetable generated with ${conflicts.length} conflict(s): ${conflicts.slice(0,3).join('; ')}`);
    } else {
      req.flash('success', `Timetable for ${classDoc.year}-${classDoc.division} generated successfully.`);
    }
    res.redirect(`/timetable/class/${classId}?semester=${semester}&year=${academicYear}`);
  } catch (err) {
    console.error('Generate error:', err);
    req.flash('error', 'Timetable generation failed: ' + err.message);
    res.redirect('/timetable');
  }
};

// GET /timetable/class/:id - Division timetable view
exports.viewClass = async (req, res) => {
  try {
    const { semester, year } = req.query;
    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) { req.flash('error', 'Class not found.'); return res.redirect('/timetable'); }

    const settings = await Settings.findOne() || {};
    const daySlots = generateDaySlots(settings);

    const timetable = await Timetable.findOne({
      class: req.params.id,
      ...(semester ? { semester: parseInt(semester) } : {}),
      ...(year ? { academicYear: year } : {})
    }).populate('slots.subject slots.professor slots.room');

    res.render('timetable/class-view', {
      title: `Timetable - ${classDoc.year}-${classDoc.division}`,
      classDoc, timetable, settings, daySlots,
      days: settings.workingDays || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load timetable.');
    res.redirect('/timetable');
  }
};

// GET /timetable/professor/:id - Faculty timetable view
exports.viewProfessor = async (req, res) => {
  try {
    const { semester, year } = req.query;
    const settings = await Settings.findOne() || {};
    const daySlots = generateDaySlots(settings);
    const professor = await Professor.findById(req.params.id);
    if (!professor) { req.flash('error', 'Professor not found.'); return res.redirect('/timetable'); }

    // Get all timetables and filter slots for this professor
    const timetables = await Timetable.find({ isGenerated: true }).populate('slots.subject slots.room class');
    const profSlots = [];
    for (const tt of timetables) {
      for (const slot of tt.slots) {
        if (slot.professor && slot.professor.toString() === req.params.id) {
          profSlots.push({ ...slot.toObject(), classInfo: tt.class });
        }
      }
    }

    res.render('timetable/professor-view', {
      title: `Faculty Timetable - ${professor.name}`,
      professor, profSlots, settings, daySlots,
      days: settings.workingDays || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load faculty timetable.');
    res.redirect('/timetable');
  }
};

// GET /timetable/room/:id - Room timetable view
exports.viewRoom = async (req, res) => {
  try {
    const settings = await Settings.findOne() || {};
    const daySlots = generateDaySlots(settings);
    const room = await Room.findById(req.params.id);
    if (!room) { req.flash('error', 'Room not found.'); return res.redirect('/timetable'); }

    const timetables = await Timetable.find({ isGenerated: true }).populate('slots.subject slots.professor');
    const roomSlots = [];
    for (const tt of timetables) {
      for (const slot of tt.slots) {
        if (slot.room && slot.room.toString() === req.params.id) {
          roomSlots.push({ ...slot.toObject(), classId: tt.class });
        }
      }
    }

    res.render('timetable/room-view', {
      title: `Room Timetable - ${room.roomNumber}`,
      room, roomSlots, settings, daySlots,
      days: settings.workingDays || []
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load room timetable.');
    res.redirect('/timetable');
  }
};

// GET /timetable/all-professors - list view
exports.allProfessors = async (req, res) => {
  const professors = await Professor.find({ isActive: true }).sort('name');
  res.render('timetable/professors-list', { title: 'Faculty Timetables', professors });
};

// GET /timetable/all-rooms
exports.allRooms = async (req, res) => {
  const rooms = await Room.find({ isActive: true }).sort('roomNumber');
  res.render('timetable/rooms-list', { title: 'Room Timetables', rooms });
};

// POST /timetable/lock-slot
exports.lockSlot = async (req, res) => {
  try {
    const { timetableId, slotId, locked } = req.body;
    await Timetable.updateOne(
      { _id: timetableId, 'slots._id': slotId },
      { $set: { 'slots.$.isLocked': locked === 'true' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

// DELETE /timetable/:id
exports.delete = async (req, res) => {
  await Timetable.findByIdAndDelete(req.params.id);
  req.flash('success', 'Timetable deleted.');
  res.redirect('/timetable');
};
