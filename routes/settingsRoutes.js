const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('./middleware');
const c = require('../controllers/settingsController');

// GET settings: both roles can view
router.get('/', requireAuth, c.getSettings);

// POST/DELETE: admin only
router.post('/', requireAdmin, c.postSettings);
router.post('/users', requireAdmin, c.postCreateUser);
router.delete('/users/:id', requireAdmin, c.deleteUser);

module.exports = router;
