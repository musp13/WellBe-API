const express = require('express');
const adminRouter = express.Router();

const { adminRegister, adminLogin, adminLogout, addTherapist, getUserList, getTherapistList } = require('../controllers/adminController');
const { verifyAdmin } = require('../auth/verifyAdmin')

adminRouter.post('/register_admin', adminRegister);
adminRouter.post('/admin_login', adminLogin);
adminRouter.post('/add_therapist', verifyAdmin, addTherapist);
adminRouter.get('/get_user_list', verifyAdmin, getUserList);
adminRouter.get('/get_therapist_list', verifyAdmin, getTherapistList);
adminRouter.post('/admin_logout',verifyAdmin, adminLogout);

module.exports = adminRouter;