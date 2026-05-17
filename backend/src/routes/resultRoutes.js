const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

router.get('/:id', resultController.getResult);

module.exports = router;
