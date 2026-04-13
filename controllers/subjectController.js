const Subject = require('../models/Subject');

exports.list = async (req, res) => {
  const subjects = await Subject.find({ isActive: true }).sort('year name');
  res.render('subjects/index', { title: 'Subjects', subjects });
};

exports.getCreate = (req, res) => {
  res.render('subjects/form', { title: 'Add Subject', subject: null, action: '/subjects' });
};

exports.postCreate = async (req, res) => {
  try {
    const { name, code, type, year, semester, weeklyHours, continuousSlots, preferredSlots } = req.body;
    await Subject.create({
      name, code, type, year,
      semester: parseInt(semester),
      weeklyHours: parseInt(weeklyHours),
      continuousSlots: type === 'lab' ? parseInt(continuousSlots || 2) : 1,
      preferredSlots: preferredSlots ? preferredSlots.split(',').map(s => s.trim()) : []
    });
    req.flash('success', 'Subject added successfully.');
    res.redirect('/subjects');
  } catch (err) {
    req.flash('error', err.code === 11000 ? 'Subject code already exists.' : err.message);
    res.redirect('/subjects/create');
  }
};

exports.getEdit = async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) { req.flash('error', 'Subject not found.'); return res.redirect('/subjects'); }
  res.render('subjects/form', { title: 'Edit Subject', subject, action: `/subjects/${subject._id}?_method=PUT` });
};

exports.putUpdate = async (req, res) => {
  try {
    const { name, code, type, year, semester, weeklyHours, continuousSlots, preferredSlots } = req.body;
    await Subject.findByIdAndUpdate(req.params.id, {
      name, code, type, year,
      semester: parseInt(semester),
      weeklyHours: parseInt(weeklyHours),
      continuousSlots: type === 'lab' ? parseInt(continuousSlots || 2) : 1,
      preferredSlots: preferredSlots ? preferredSlots.split(',').map(s => s.trim()) : []
    });
    req.flash('success', 'Subject updated.');
    res.redirect('/subjects');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/subjects/${req.params.id}/edit`);
  }
};

exports.delete = async (req, res) => {
  await Subject.findByIdAndUpdate(req.params.id, { isActive: false });
  req.flash('success', 'Subject deleted.');
  res.redirect('/subjects');
};
