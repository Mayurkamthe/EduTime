const Subject = require('../models/Subject');
const Professor = require('../models/Professor');
const Room = require('../models/Room');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const Settings = require('../models/Settings');

exports.getDashboard = async (req, res) => {
  try {
    const [subjectCount, professorCount, roomCount, classCount, timetableCount, settings] = await Promise.all([
      Subject.countDocuments({ isActive: true }),
      Professor.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: true }),
      Timetable.countDocuments({ isGenerated: true }),
      Settings.findOne()
    ]);

    res.render('dashboard/index', {
      title: 'Dashboard',
      stats: { subjectCount, professorCount, roomCount, classCount, timetableCount },
      settings
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/login');
  }
};
