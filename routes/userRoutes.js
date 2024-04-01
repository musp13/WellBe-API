const express = require('express');
const {userRegister, verifyMail, userLogin, userLogout, resendOTP} = require('../controllers/userController');
const { verifyUser } = require('../auth/verifyUser');

const userRouter = express.Router();

userRouter.post('/register_user', userRegister);
userRouter.post('/verify_user', verifyMail);
userRouter.post('/user_login', userLogin);
userRouter.post('/resend_otp', resendOTP);
userRouter.post('/user_logout',verifyUser, userLogout);

module.exports = userRouter;