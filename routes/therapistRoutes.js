const express = require('express');
const {therapistRegister, verifyMail, therapistLogin, therapistLogout} = require('../controllers/therapistController');
const { verifyTherapist } = require('../auth/verifyTherapist');
const { verifyAdmin } = require('../auth/verifyAdmin');

const therapistRouter = express.Router();

therapistRouter.post('/register_therapist',verifyAdmin, therapistRegister);
therapistRouter.get('/verify_therapist',verifyMail);
therapistRouter.post('/therapist_login', therapistLogin);
therapistRouter.post('/therapist_logout',verifyTherapist, therapistLogout);

module.exports = therapistRouter;