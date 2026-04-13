const Professor = require('../models/Professor');
const Subject = require('../models/Subject');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

exports.list = async (req, res) => {
  const professors = await Professor.find({ isActive: true }).populate('subjects', 'name code').sort('name');
  res.render('professors/index', { title: 'Professors', professors });
};

exports.getCreate = async (req, res) => {
  const subjects = await Subject.find({ isActive: true }).sort('year name');
  res.render('professors/form', { title: 'Add Professor', professor: null, subjects, days: DAYS, action: '/professors' });
};

exports.postCreate = async (req, res) => {
  try {
    const { name, email, employeeId, department, subjects, maxLecturesPerDay, availableDays } = req.body;
    const subjectIds = Array.isArray(subjects) ? subjects : (subjects ? [subjects] : []);
    const days = Array.isArray(availableDays) ? availableDays : (availableDays ? [availableDays] : DAYS);

    await Professor.create({
      name, email, employeeId, department,
      subjects: subjectIds,
      maxLecturesPerDay: parseInt(maxLecturesPerDay) || 4,
      availability: { days }
    });
    req.flash('success', 'Professor added.');
    res.redirect('/professors');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Email already exists.' : err.message);
    res.redirect('/professors/create');
  }
};

exports.getEdit = async (req, res) => {
  const [professor, subjects] = await Promise.all([
    Professor.findById(req.params.id),
    Subject.find({ isActive: true }).sort('year name')
  ]);
  if (!professor) { req.flash('error', 'Professor not found.'); return res.redirect('/professors'); }
  res.render('professors/form', {
    title: 'Edit Professor', professor, subjects, days: DAYS,
    action: `/professors/${professor._id}?_method=PUT`
  });
};

exports.putUpdate = async (req, res) => {
  try {
    const { name, email, employeeId, department, subjects, maxLecturesPerDay, availableDays } = req.body;
    const subjectIds = Array.isArray(subjects) ? subjects : (subjects ? [subjects] : []);
    const days = Array.isArray(availableDays) ? availableDays : (availableDays ? [availableDays] : DAYS);

    await Professor.findByIdAndUpdate(req.params.id, {
      name, email, employeeId, department,
      subjects: subjectIds,
      maxLecturesPerDay: parseInt(maxLecturesPerDay) || 4,
      'availability.days': days
    });
    req.flash('success', 'Professor updated.');
    res.redirect('/professors');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/professors/${req.params.id}/edit`);
  }
};

exports.delete = async (req, res) => {
  await Professor.findByIdAndUpdate(req.params.id, { isActive: false });
  req.flash('success', 'Professor deleted.');
  res.redirect('/professors');
};
