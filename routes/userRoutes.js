const express = require('express');
const {userRegister, verifyMail, userLogin, userLogout, resendOTP, addJournal, getJournal, deleteJournal} = require('../controllers/userController');
const { verifyUser } = require('../auth/verifyUser');

const userRouter = express.Router();

userRouter.post('/register_user', userRegister);
userRouter.patch('/verify_user', verifyMail);
userRouter.post('/user_login', userLogin);
userRouter.patch('/resend_otp', resendOTP);
userRouter.post('/add_journal', verifyUser, addJournal);
userRouter.get('/get_journals', verifyUser, getJournal);
userRouter.delete('/delete_journal/:journalId', verifyUser, deleteJournal);
userRouter.post('/user_logout',verifyUser, userLogout);

module.exports = userRouter;