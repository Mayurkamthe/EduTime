const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('./middleware');
const c = require('../controllers/timetableController');

// Both roles can view timetables
router.get('/', requireAuth, c.index);
router.get('/class/:id', requireAuth, c.viewClass);
router.get('/professor/:id', requireAuth, c.viewProfessor);
router.get('/room/:id', requireAuth, c.viewRoom);
router.get('/all-professors', requireAuth, c.allProfessors);
router.get('/all-rooms', requireAuth, c.allRooms);

// Admin only: generate, lock, delete
router.post('/generate', requireAdmin, c.generate);
router.post('/lock-slot', requireAdmin, c.lockSlot);
router.delete('/:id', requireAdmin, c.delete);

module.exports = router;
