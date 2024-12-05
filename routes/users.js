const express = require('express');
const router = express.Router();
const { createUser, getUserWithAuth, validateUserHash, sendEmailCode, validateOTP } = require('../controllers/users');

router.post('/users', createUser);
router.post('/authenticate', getUserWithAuth);
router.post('/validateUserHash', validateUserHash)
router.post('/otp', sendEmailCode)
router.post('/validateOtp', validateOTP)
module.exports = router;
