const express = require('express');
const adminRouter = express.Router();

const { adminRegister, adminLogin, adminLogout } = require('../controllers/adminController');

adminRouter.post('/register-admin', adminRegister);
adminRouter.post('/admin_login', adminLogin);
adminRouter.post('/admin_logout', adminLogout);

module.exports = adminRouter;