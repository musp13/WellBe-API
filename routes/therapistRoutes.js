const express = require('express');
const {therapistRegister, verifyMail, therapistLogin, therapistLogout} = require('../controllers/therapistController')

const therapistRouter = express.Router();

therapistRouter.post('/register-therapist', therapistRegister);
therapistRouter.get('/verify_therapist',verifyMail);
therapistRouter.post('/therapist_login', therapistLogin);
therapistRouter.post('/therapist_logout', therapistLogout);

module.exports = therapistRouter;