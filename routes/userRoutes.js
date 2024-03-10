const express = require('express');
const {userRegister, verifyMail, userLogin, userLogout} = require('../controllers/userController')

const userRouter = express.Router();

userRouter.post('/register-user', userRegister);
userRouter.get('/verify_user',verifyMail);
userRouter.post('/user_login',userLogin);
userRouter.post('/user_logout', userLogout);

module.exports = userRouter;