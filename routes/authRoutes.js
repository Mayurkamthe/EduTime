const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.get('/verify-otp', auth.getVerifyOTP);
router.post('/verify-otp', auth.postVerifyOTP);
router.post('/logout', auth.logout);

module.exports = router;
