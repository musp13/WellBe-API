const express = require('express');
const adminRouter = express.Router();

const { adminRegister, adminLogin, adminLogout, addTherapist, getUserList, getTherapistList, therapistApproveToggle, therapistBlockToggle, userBlockToggle, deleteTherapist, DeleteUser, poupulateSlots, populateSlots } = require('../controllers/adminController');
const { verifyAdmin } = require('../auth/verifyAdmin');
const { routeCheck } = require('../utils/routeCheck');

adminRouter.post('/register_admin', adminRegister);
adminRouter.post('/admin_login', adminLogin);
//adminRouter.post('/populate_slots', populateSlots)  // only for adding time slots
adminRouter.post('/add_therapist', verifyAdmin, addTherapist);
adminRouter.get('/get_user_list', verifyAdmin, getUserList);
adminRouter.get('/get_therapist_list', verifyAdmin, getTherapistList);
adminRouter.patch('/therapist_approve_toggle/:therapistId',verifyAdmin, therapistApproveToggle);
adminRouter.patch('/therapist_block_toggle/:therapistId', verifyAdmin, therapistBlockToggle);
adminRouter.patch('/user_block_toggle/:userId', verifyAdmin, userBlockToggle);
adminRouter.patch('/delete_therapist/:therapistId', verifyAdmin, deleteTherapist);
adminRouter.patch('/delete_user/:userId', verifyAdmin, DeleteUser);
adminRouter.post('/admin_logout',verifyAdmin, adminLogout);

module.exports = adminRouter;