const User = require('../models/User');

// GET /register
exports.getRegister = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Register', formData: {} });
};

// POST /register
exports.postRegister = async (req, res) => {
  const { name, email, password, confirmPassword, role, department } = req.body;
  const formData = { name, email, role, department };

  try {
    console.log(`[AUTH] Register attempt for: ${email}`);

    if (!name || !email || !password || !confirmPassword) {
      req.flash('error', 'All required fields must be filled.');
      return res.render('auth/register', { title: 'Register', formData });
    }
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.render('auth/register', { title: 'Register', formData });
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.render('auth/register', { title: 'Register', formData });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.warn(`[AUTH] Email already registered: ${email}`);
      req.flash('error', 'An account with this email already exists.');
      return res.render('auth/register', { title: 'Register', formData });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'hod',
      department: department ? department.trim() : undefined
    });

    console.log(`[AUTH] ✅ New user registered: ${user.email} (${user.role})`);
    req.flash('success', 'Account created successfully! Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error('[AUTH] ❌ Register error:', err);
    req.flash('error', 'Registration failed. Please try again.');
    res.render('auth/register', { title: 'Register', formData });
  }
};

// GET /login
exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login' });
};

// POST /login - Password based
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt for: ${email}`);

    if (!email || !password) {
      req.flash('error', 'Email and password are required.');
      return res.redirect('/login');
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      console.warn(`[AUTH] ❌ No active user found for: ${email}`);
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      console.warn(`[AUTH] ❌ Wrong password for: ${email}`);
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    console.log(`[AUTH] ✅ Login successful: ${user.email} (${user.role})`);
    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[AUTH] ❌ Login error:', err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
};

// POST /logout
exports.logout = (req, res) => {
  const email = req.session.user?.email;
  req.session.destroy();
  console.log(`[AUTH] 👋 Logged out: ${email}`);
  res.redirect('/login');
};
