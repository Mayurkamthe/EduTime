const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');
const ctrl = require('../controllers/dashboardController');
router.get('/', requireAuth, ctrl.getDashboard);
module.exports = router;
