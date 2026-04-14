const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please login to continue.');
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please login to continue.');
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    req.flash('error', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
