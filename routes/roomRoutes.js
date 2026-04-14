const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('./middleware');
const c = require('../controllers/roomController');

router.get('/', requireAuth, c.list);
router.get('/create', requireAdmin, c.getCreate);
router.post('/', requireAdmin, c.postCreate);
router.get('/:id/edit', requireAdmin, c.getEdit);
router.put('/:id', requireAdmin, c.putUpdate);
router.delete('/:id', requireAdmin, c.delete);

module.exports = router;
