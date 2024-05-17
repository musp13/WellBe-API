const express = require('express');
const {userRegister, verifyMail, userLogin, userLogout, resendOTP, addJournal, getJournal, deleteJournal, setOtp, getMyJournal, getJournals, editJournal, getAppontmentFormDetails, getTherapistAvailability, bookAppointment, getBookedSlots, getAppointmentList, cancelAppointment, getCancelledAppointments, createAppointmentOrder, appointmentPaymentSuccess, appointmentPaymentCancel} = require('../controllers/userController');
const { verifyUser } = require('../auth/verifyUser');
const { getAppointmentDetails } = require('../controllers/commonController');

const userRouter = express.Router();

userRouter.post('/register_user', userRegister);
userRouter.patch('/verify_user', verifyMail);
userRouter.post('/user_login', userLogin);
userRouter.patch('/resend_otp', resendOTP);
userRouter.post('/add_journal', verifyUser, addJournal);
userRouter.get('/get_journals', verifyUser, getJournals);
userRouter.delete('/delete_journal/:journalId', verifyUser, deleteJournal);
userRouter.get('/get_my_journal/:journalId', verifyUser, getMyJournal);
userRouter.patch('/edit_journal/:journalId', verifyUser, editJournal);
userRouter.post('/set_otp/:userId', setOtp);
userRouter.get('/get_appointmentform_details', verifyUser, getAppontmentFormDetails);
userRouter.get('/get_therapist_availability/:therapistId', verifyUser, getTherapistAvailability);
userRouter.post('/book_appointment',verifyUser, bookAppointment);
userRouter.get('/get_booked_slots/:therapistId/:date',verifyUser, getBookedSlots);
userRouter.get('/get_appointment_list',verifyUser, getAppointmentList);
userRouter.get('/get_cancelled_appointments',verifyUser, getCancelledAppointments);
userRouter.patch('/cancel_appointment/:appointmentId', verifyUser, cancelAppointment);
userRouter.get('/get_appointment_details/:appointmentId', verifyUser, getAppointmentDetails);
userRouter.post('/create_appointment_order', verifyUser, createAppointmentOrder);
userRouter.post('/appointment_payment_success', verifyUser, appointmentPaymentSuccess);
userRouter.get('/appointment_payment_cancel', verifyUser, appointmentPaymentCancel)
userRouter.post('/user_logout',verifyUser, userLogout);

module.exports = userRouter;