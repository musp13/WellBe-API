const express = require('express');
const {therapistRegister, verifyMail, therapistLogin, therapistLogout, getTherapistId, resendOTP, sendResetEmail, resetPassword} = require('../controllers/therapistController');
const { verifyTherapist } = require('../auth/verifyTherapist');
//const { verifyAdmin } = require('../auth/verifyAdmin');

const therapistRouter = express.Router();

//therapistRouter.post('/register_therapist',verifyAdmin, therapistRegister);
therapistRouter.patch('/verify_therapist',verifyMail);
therapistRouter.post('/therapist_login', therapistLogin);
therapistRouter.post('/get_therapist_id', getTherapistId);
therapistRouter.patch('/resend_otp', resendOTP);
therapistRouter.post('/send_reset_email', sendResetEmail);
therapistRouter.patch('/reset_password', resetPassword);
therapistRouter.post('/therapist_logout',verifyTherapist, therapistLogout);

module.exports = therapistRouter;