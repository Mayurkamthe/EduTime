const User = require('../models/User');
const { sendOTPEmail } = require('../config/mailer');

// Generate 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// GET /login
exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login' });
};

// POST /login - Send OTP
exports.postLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      req.flash('error', 'Please enter a valid email address.');
      return res.redirect('/login');
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      req.flash('error', 'No account found with this email.');
      return res.redirect('/login');
    }

    const otp = generateOTP();
    await user.setOTP(otp);
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp);

    // Store email in session for OTP verification step
    req.session.pendingEmail = user.email;
    req.flash('success', `OTP sent to ${user.email}. Valid for 5 minutes.`);
    res.redirect('/verify-otp');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Failed to send OTP. Check email configuration.');
    res.redirect('/login');
  }
};

// GET /verify-otp
exports.getVerifyOTP = (req, res) => {
  if (!req.session.pendingEmail) return res.redirect('/login');
  res.render('auth/verify-otp', {
    title: 'Verify OTP',
    email: req.session.pendingEmail
  });
};

// POST /verify-otp
exports.postVerifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/login');

    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Session expired. Please login again.');
      return res.redirect('/login');
    }

    const valid = await user.verifyOTP(otp);
    if (!valid) {
      req.flash('error', 'Invalid or expired OTP. Please try again.');
      return res.redirect('/verify-otp');
    }

    // Clear OTP
    user.clearOTP();
    user.lastLogin = new Date();
    await user.save();

    // Create session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    delete req.session.pendingEmail;

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('OTP verify error:', err);
    req.flash('error', 'Verification failed. Please try again.');
    res.redirect('/verify-otp');
  }
};

// POST /logout
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/login');
};
