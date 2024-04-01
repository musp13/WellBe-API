const express = require('express');
const adminRouter = express.Router();

const { adminRegister, adminLogin, adminLogout } = require('../controllers/adminController');
const { verifyAdmin } = require('../auth/verifyAdmin')

adminRouter.post('/register_admin', adminRegister);
adminRouter.post('/admin_login', adminLogin);
adminRouter.post('/admin_logout',verifyAdmin, adminLogout);

module.exports = adminRouter;