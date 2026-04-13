const express = require('express');
const router = express.Router();
const { requireAuth } = require('./middleware');
const c = require('../controllers/exportController');
router.get('/pdf', requireAuth, c.classPDF);
router.get('/excel', requireAuth, c.classExcel);
module.exports = router;
