const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');
const c = require('../controllers/settingsController');
router.get('/', requireAuth, c.getSettings);
router.post('/', requireAuth, c.postSettings);
router.post('/users', requireAuth, c.postCreateUser);
router.delete('/users/:id', requireAuth, c.deleteUser);
module.exports = router;
