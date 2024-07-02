const express = require('express');
const {therapistRegister, verifyMail, therapistLogin, therapistLogout, getTherapistId, resendOTP, sendResetEmail, resetPassword, setOtp, getTherapistDetails, setAvailability, addLeave, getMyAvailability, getAppointmentList, cancelAppointment, getMyLeave, removeLeaveDate, editProfile, getCancelledAppointments, saveRoomId, saveTherapistPeerId, removeTherapistPeerId} = require('../controllers/therapistController');
const { verifyTherapist } = require('../auth/verifyTherapist');
const { getAppointmentDetails } = require('../controllers/commonController');
//const { verifyAdmin } = require('../auth/verifyAdmin');

const therapistRouter = express.Router();

const routeCheck = (req,res,next)=>{
    console.log("this route works");
    next();
}

//therapistRouter.post('/register_therapist',verifyAdmin, therapistRegister);
therapistRouter.patch('/verify_therapist',verifyMail);
therapistRouter.post('/therapist_login', therapistLogin);
therapistRouter.post('/get_therapist_id', getTherapistId);
therapistRouter.post('/resend_otp', resendOTP);
therapistRouter.post('/send_reset_email', sendResetEmail);
therapistRouter.patch('/reset_password', resetPassword);
therapistRouter.post('/set_otp/:therapistId', setOtp);
therapistRouter.get('/get_therapist_details/:therapistId', verifyTherapist, getTherapistDetails);
therapistRouter.patch('/set_availability',verifyTherapist, setAvailability);
therapistRouter.get('/get_my_availability', verifyTherapist, getMyAvailability);
therapistRouter.get('/get_my_leave', verifyTherapist, getMyLeave);
therapistRouter.patch('/add_leave',verifyTherapist, addLeave);
therapistRouter.patch('/remove_leave_date',verifyTherapist, removeLeaveDate);
therapistRouter.get('/get_appointment_list', verifyTherapist, getAppointmentList);
therapistRouter.patch('/cancel_appointment/:appointmentId', verifyTherapist, cancelAppointment);
therapistRouter.get('/get_appointment_details/:appointmentId', verifyTherapist, getAppointmentDetails);
therapistRouter.get('/get_cancelled_appointments', verifyTherapist, getCancelledAppointments);
therapistRouter.patch('/edit_profile', verifyTherapist, editProfile);
therapistRouter.patch('/save_room_id', verifyTherapist, saveRoomId);
therapistRouter.patch('/save_therapist_peer_id', verifyTherapist, saveTherapistPeerId);
therapistRouter.patch('/remove_therapist_peer_id', verifyTherapist, removeTherapistPeerId);
therapistRouter.post('/therapist_logout',verifyTherapist, therapistLogout);

module.exports = therapistRouter;