const express = require('express');
const router = express.Router();
const { balance, createAccount, deposito } = require('../controllers/account');

router.post('/createAccount', createAccount);
router.post('/accountBalance', balance);
router.post('/deposito', deposito)

module.exports = router;