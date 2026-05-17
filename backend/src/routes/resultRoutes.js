const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

router.get('/recent', resultController.getRecent);
router.get('/analytics', resultController.getAnalytics);
router.get('/:id', resultController.getResult);

module.exports = router;
