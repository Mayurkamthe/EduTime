const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
router.get('/login', auth.getLogin);
router.post('/login', auth.postLogin);
router.get('/register', auth.getRegister);
router.post('/register', auth.postRegister);
router.post('/logout', auth.logout);

module.exports = router;
