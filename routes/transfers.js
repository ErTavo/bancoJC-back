const express = require('express');
const router = express.Router();
const {newTransfer, history } = require('../controllers/transfers');

router.post('/newTransfer', newTransfer);
router.post('/history', history);



module.exports = router;