const User = require('../models/userModel.js');
const Journal = require('../models/jounalModel.js');
const UserOtp = require('../models/userOtpModel.js');
const Therapist = require('../models/therapistModel.js');
const Appointment = require('../models/appointmentModel.js');
const RazorpayOrder = require('../models/razorpayOrderModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { generateOTP } = require('../utils/otpGenerator.js');
const { sendVerifyMail } = require('../utils/sendVerifyMail.js');
const { encrypt, decrypt } = require('../utils/encryption.js');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const Razorpay  = require('razorpay');
const crypto = require('crypto');
const Chat = require('../models/chatModel.js');

function hmac_sha256(data, key) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

const baseUrl = process.env.BASE_URL;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

/* const sendVerifyMail=async (name,email,user_id)=>{
    try
    {
        const otp = generateOTP()+'';
        console.log('lets check otp type',  typeof otp);
        //console.log("checking credentials", emailUser, emailPassword);
        const transporter = nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: emailUser,
                pass: emailPassword
            }
        });
        const mailOptions = {
            from: {
                name: 'WellBe',
                address: emailUser,
            },
            to: email,
            subject:'For Email Verification',
            html: `<p>Hi ${name}. Please enter this OTP to verify your Email. Your OTP is ${otp}<p>`
            //html:`<p>Hi ${name}. Please click here to <a href="${baseUrl}verify_user?id=${user_id}">verify your email</a>. </p>`
        }
        transporter.sendMail(mailOptions,(error,info)=>{
            if(error)
            {
                console.log(error);
            }
            else
            {
                console.log("Email has been sent.",info.response);
            }
        })
        console.log(`check otp before return sendmail ${otp}`);
        return otp;
    }
    catch(err)
    {
        console.log(err.message);
    }
}; */

module.exports.userRegister = async (req,res,next)=>{
    try {
        let OTP;
        const user = await User.findOne({$or:[{email: req.body.email}, {userName: req.body.userName}]});
        if(user)
        {
            return next(CreateError(400, "Email or username already registered"));
        }
        if(req.body.fullName.trim().length<3)
        {
            return next(CreateError(403, "Full Name should have atleast 3 characters"));
        }
        if(req.body.password != req.body.confirmPassword)
        {
            return next(CreateError(402, "Passwords do not match"));
        }
        if(req.body.password.trim().length<8)
        {
            return next(CreateError(402, "Password should be atleast 8 characters"));
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newUser = new User({
            fullName:req.body.fullName,
            email: req.body.email,
            userName: req.body.userName,
            password: hashedPassword
        });

        await newUser.save();

        if(newUser)
        {
            OTP = await sendVerifyMail(req.body.fullName,req.body.email,newUser._id);
            console.log(`check otp inisde register fn =`, OTP);
            await User.findByIdAndUpdate({_id:newUser._id},{$set:{OTP: OTP}});
            const data = {
                id: newUser._id, 
                OTP: OTP,
                userType: "user"
            }
            return next(CreateSuccess(200, 'Regsitration Successful. Please verify your mail.', data));
        }
        else
        {
            return next(CreateError(406, 'Regsitration Failed!'))
        }

    } catch (error) {
        console.log(error.message);
    }
}

module.exports.verifyMail = async (req,res,next)=>{
    try
    {
        //console.log(`inside verifymail req.body ${req.body.otp} and req.query = ${req.query.userId}`);
        
        const user = await User.findById(req.query.userId);
        //console.log('check id user is found', user);
        if(user.isVerified)
        {
            return next(CreateSuccess(200,'User has been already verified.'))
        }

        const OTP = await UserOtp.findOne({userId:user._id});

        if(!OTP){
            return next(CreateError(402, "OTP has been expired"));
        } 

        const enteredOTP = req.body.otp;
        if (OTP.OTP === enteredOTP) {
            const updateInfo = await User.updateOne({_id:req.query.userId},{$set:{isVerified:true}});
            return next(CreateSuccess(200, 'Your Email has been verified.'));
        }
        else{
            return next(CreateError(403, "OTP doesn't match"))
        }
    }
    catch(err)
    {

        console.error("Error verifying user's email:", err.message);

        let errorMessage = "An error occurred while verifying the email.";

        if (err.name === "CastError" && err.kind === "ObjectId") {
            errorMessage = "Invalid user ID provided.";
        }

        /* if (err.code === 11000) {
            errorMessage = "Email has already been verified.";
        } */

        return next(CreateError(406, errorMessage));
    }
}

module.exports.resendOTP = async (req,res,next)=>{
    try {
        const user = await User.findById(req.body.userId);
        if(!user)
            return next(CreateError(404, "User not found"));

        if(user)
        {
            if(user.isVerified)
            {
                return next(CreateError(403, 'User has been already verified'))
            }
            const OTP = await sendVerifyMail(user.fullName,user.email,user._id);
            //await User.findByIdAndUpdate({_id:user._id},{$set:{OTP: OTP}});
            otpExists = await UserOtp.findOne({userId:user._id});

            if(otpExists)
            {
                await UserOtp.findOneAndDelete({userId:user._id}); 
            }
            
            const newUserOtp = new UserOtp({
                userId: user._id,
                OTP: OTP
            });

            await newUserOtp.save();

            if(newUserOtp)
                return next(CreateSuccess(200, 'OTP has been resent.'));
            else
                return next(CreateSuccess(402, 'Failed to resed OTP.'));

        }
        else
        {
            return next(CreateError(406, 'OTP resend Failed!'))
        }
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, 'Something went wrong!'))
    }
}

module.exports.userLogin = async (req,res,next)=>{
    try {
        const user = await User.findOne({email: req.body.email});
        
        if(!user)
        {
            return next(CreateError(404,'User not found'))
        }
        if(user.isDeleted)
        {
            return next(CreateError(406,'User is deleted'));
        }
        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password);
        if(!isPasswordCorrect)
        {
            return next(CreateError(400,'Password is incorrect'));
        }
        
        if(user.isBlocked)
        {
            return next(CreateError(402,'User is blocked'));
        }

        if(!user.isVerified)
        {
            return next(CreateError(402,'User is not verified'));
        }

        const token = jwt.sign(
            {id: user._id, isUser: true},
            process.env.JWT_SECRET
        );

        //req.session.access_token = token;
        //req.session.cookie.access_token=token;
        const userData = {
            userId : user._id,
            userName: user.userName,
            email : user.email
        }
        
        res.cookie("user_access_token", token, {httpOnly: true, maxAge:24*60*60*1000})
           .status(200)
           .json({
                status: 200,
                message: "Login Success",
                data: userData,
                user_token: token
           });

    } catch (error) {
            return next(CreateError(500,'Something went wrong!'));
    }
}

module.exports.userLogout = (req,res,next)=>{
    res.cookie("user_access_token","",{maxAge:0});
    return next(CreateSuccess(200,'User logged out'));
}


module.exports.addJournal = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user)
        {
            return next(CreateError(404,"User not found"));
        }
        if(!req.body.todaysFocus.trim())
        {
            return next(CreateError(402,"Please add today's focus"));
        }

        const newJournal = new Journal({
            userId: userId,
            morningAffirmations: {
                todaysFocus: encrypt(req.body.todaysFocus),
                excitedAbout: encrypt(req.body.excitedAbout),
                affirmation: encrypt(req.body.affirmation),
                todaysGoal: encrypt(req.body.todaysGoal)
            },
            eveningReflections: {
                goodThings: [encrypt(req.body.goodThings1),encrypt(req.body.goodThings2),encrypt(req.body.goodThings3)],
                positiveActions: [encrypt(req.body.positiveActions1),encrypt(req.body.positiveActions2),encrypt(req.body.positiveActions3)],
                gratefulFor: [encrypt(req.body.gratefulFor1),encrypt(req.body.gratefulFor2),encrypt(req.body.gratefulFor3)],
                peopleMadeFeelGood: [encrypt(req.body.peopleMadeFeelGood1),encrypt(req.body.peopleMadeFeelGood2),encrypt(req.body.peopleMadeFeelGood3)]
            }
        });

        await newJournal.save();

        if(newJournal)
            return next(CreateSuccess(200, "Journal added"));
        else
            return next(CreateError(402, "Failed to add journal"));
        
       
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong"));
    }
}

module.exports.getJournals = async (req,res,next)=>{
    try {
        const userId = req.query.id;

        const user = await User.findById(userId);

        if(!user)
        {
            return next(CreateError(404, "User not found"));
        }

        const journals = await Journal.find({userId:user._id});


        const decryptedJournals = journals.map(journal => {
            //console.log(journal.morningAffirmations.todaysFocus);
            return{
                journalId: journal._id,
                todaysFocus: decrypt(journal.morningAffirmations.todaysFocus),
                createdAt: journal.createdAt
            }
        })
        
        //console.log(decryptedJournals);

        return next(CreateSuccess(200, "Journals Fetched Successfully", {journals: decryptedJournals}));
        //return next(CreateSuccess(200, "User Found"));
        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the journals"));
    }

}

module.exports.deleteJournal = async (req, res, next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user)
        {
            return next(CreateError(404, "User not found"));
        }

        const journalId = req.params.journalId;
        const journal = await Journal.findById(journalId);
        if(!journal)
        {
            return next(CreateError(404, "Journal not found"));
        }

        if(userId !== journal.userId.toString())
        {
            return next(CreateError(405, "You don't have access to this journal."));
        }

        const deletedJournal = await Journal.findByIdAndDelete(journalId);

        if(deletedJournal)
            return next(CreateSuccess(200, "Journal has been deleted"))
        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while deleting the journal"));
    }
}

module.exports.setOtp = async (req,res,next)=>{
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        if(!user)
            return next(CreateError(404, "User not found"));

        const OTP = await sendVerifyMail(user.fullName,user.email, user._id);

        otpExists = await UserOtp.findOne({userId:user._id});

        if(otpExists)
        {
            await UserOtp.findOneAndDelete({userId:user._id}); 
        }
            
        const newUserOtp = new UserOtp({
            userId: user._id,
            OTP: OTP
        });

        const newOTP = await newUserOtp.save();

        if(newOTP)
        {
            console.log(" new otp: ", newOTP);
            return next(CreateSuccess(200, "OTP has been set!"));
        }
        return next(CreateError(400, "Failed to set OTP!"));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while setting the OTP."))
    }
}

module.exports.getMyJournal = async (req,res,next) =>{
    try {
        console.log('userId: ', req.query.id);
        console.log('journalId: ', req.params.journalId);
        const userId = req.query.id;
        const journalId = req.params.journalId;
        
        const journal = await Journal.findById(journalId);
        if(!journal){
            return next(CreateError(404, "Journal not found."));
        }

        if (journal.userId.toString()!==userId) {
            return next(CreateError(403, "You are not authorized user."));
        }

        journalData = {
            todaysFocus:  decrypt(journal.morningAffirmations.todaysFocus),
            excitedAbout: decrypt(journal.morningAffirmations.excitedAbout),
            todaysGoal: decrypt(journal.morningAffirmations.todaysGoal),
            affirmation: decrypt(journal.morningAffirmations.affirmation),
            goodThings1: decrypt(journal.eveningReflections.goodThings[0]),
            goodThings2: decrypt(journal.eveningReflections.goodThings[1]),
            goodThings3: decrypt(journal.eveningReflections.goodThings[2]),
            positiveActions1: decrypt(journal.eveningReflections.positiveActions[0]),
            positiveActions2: decrypt(journal.eveningReflections.positiveActions[1]),
            positiveActions3: decrypt(journal.eveningReflections.positiveActions[2]),
            gratefulFor1: decrypt(journal.eveningReflections.gratefulFor[0]),
            gratefulFor2: decrypt(journal.eveningReflections.gratefulFor[1]),
            gratefulFor3: decrypt(journal.eveningReflections.gratefulFor[2]),
            peopleMadeFeelGood1: decrypt(journal.eveningReflections.peopleMadeFeelGood[0]),
            peopleMadeFeelGood2: decrypt(journal.eveningReflections.peopleMadeFeelGood[1]),
            peopleMadeFeelGood3: decrypt(journal.eveningReflections.peopleMadeFeelGood[2]),
        }

        return next(CreateSuccess(200, "Journal data fetched successfully", journalData));        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching your journal."));
    }
}

module.exports.editJournal = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);

        if(!user)
        {
            return next(CreateError(404,"User not found"));
        }

        const journalId = req.params.journalId;
        const journal = await Journal.findById(journalId);

        if(!journal)
        {
            return next(CreateError(404,"Journal not found"));
        }

        if(journal.userId.toString() !== user._id.toString())
        {
            return next(CreateError(405,"You are not authorized to accedd this journal."));
        }

        //console.log(req.body);

        if(!req.body.todaysFocus.trim())
        {
            return next(CreateError(402,"Please add today's focus"));
        }

        const updatedJounal = await Journal.findByIdAndUpdate(journalId,{$set:{
            morningAffirmations: {
                todaysFocus: encrypt(req.body.todaysFocus),
                excitedAbout: encrypt(req.body.excitedAbout),
                affirmation: encrypt(req.body.affirmation),
                todaysGoal: encrypt(req.body.todaysGoal)
            },
            eveningReflections: {
                goodThings: [encrypt(req.body.goodThings1),encrypt(req.body.goodThings2),encrypt(req.body.goodThings3)],
                positiveActions: [encrypt(req.body.positiveActions1),encrypt(req.body.positiveActions2),encrypt(req.body.positiveActions3)],
                gratefulFor: [encrypt(req.body.gratefulFor1),encrypt(req.body.gratefulFor2),encrypt(req.body.gratefulFor3)],
                peopleMadeFeelGood: [encrypt(req.body.peopleMadeFeelGood1),encrypt(req.body.peopleMadeFeelGood2),encrypt(req.body.peopleMadeFeelGood3)]
            }
        }});

        //await newJournal.save();

        if(updatedJounal)
            return next(CreateSuccess(200, "Journal updated"));
        else
            return next(CreateError(402, "Failed to update journal")); 
       
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while updating the journal."));
    }
}

module.exports.getAppontmentFormDetails = async (req,res,next) => {
    try {
        //console.log(req.query.id);
        const userId = req.query.id;
        const user = await User.findById(userId, {fullName:1, email:1, phoneNo:1, _id:0});
        if(!user)
        {
            return next(CreateError(404,"User not found"));
        }

        const conditions = {
            isApproved : true,
            isVerified : true,
            isBlocked : false,
            isDeleted : false,
            'availability.0' : {$exists: true}
        }
        const therapists = await Therapist.find(conditions,{fullName:1});

        //const therapistList = therapists.map(therapist => therapist.fullName);

        const formDetails = {
            fullName : user.fullName,
            email : user.email,
            phoneNo : user?.phoneNo,
            therapistList : therapists
        }

        console.log(formDetails);

        return next(CreateSuccess(200, "Appointment form details fetched successfully", formDetails));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching details for appointment form."));
    }
}

module.exports.getTherapistAvailability = async (req,res,next) => {
    try {
        const therapistId = req.params.therapistId;
        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            return next(CreateError(404, "Therapist Not Found"));
        }

        if(!therapist.isApproved || !therapist.isVerified || therapist.isDeleted || therapist.isBlocked || therapist.availability.length===0)
        {
            return next(CreateError(403, "Therapist is currently not available"));
        }

        const currentDate = new Date();
        const futureLeaves = therapist.leave.filter(leave=> leave.leaveDate >= currentDate);
        const consultationFee = therapist.consultationFee;

        const availabilityDetails = {
            availability : therapist.availability,
            //leave : therapist.leave
            leave: futureLeaves,
            consultationFee 
        }
        console.log('availabilityDetails: ',availabilityDetails);
        return next(CreateSuccess(200, "Therapist's availability details fetched successfully", availabilityDetails));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching therapist's availability."));
    }
}

module.exports.bookAppointment = async (req,res, next)=> {
    try {
        console.log(req.query.id);
        console.log(req.body);
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user) {
            return next(CreateError(404, "User not found"));
        }

        const {
            therapistId,
            clientId,
            clientContactNumber,
            date,
            slotNumber,
            message,
            participants
        } = req.body;
        
        const therapist = await Therapist.find({_id:therapistId, isVerified: true, isApproved: true, isBlocked: {$ne:true}, isDeleted:{$ne:true}})
        if(!therapist){
            return next(CreateError(400, "Therapist is currently unavailable."));
        }
        
        const existingAppointment = await Appointment.findOne({
            therapistId,
            date,
            slotNumber,
            status: {$nin: ['cancelled', 'pending', 'processing']}
        });
        if(existingAppointment && existingAppointment.status==='processing'){
            return next(CreateError(400, "This slot is temporarily unavailable."));
        }

        if(existingAppointment){
            return next(CreateError(400, "Therapist is already booked for the selected date and time slot."));
        }

        const existingAppointmentbyUser = await Appointment.findOne({
            clientId: userId,
            date,
            slotNumber,
            status: {$nin: ['cancelled', 'pending']}
        });
        if(existingAppointmentbyUser){
            return next(CreateError(400, "You have already booked appointment for the selected date and time slot."));
        }

        const lastAppointment = await Appointment.findOne().sort({appointmentNumber:-1});
        const appointmentNumber = lastAppointment ? lastAppointment.appointmentNumber +1 : 1 ;

        const newAppointment = new Appointment({
        therapistId,
        clientId,
        clientContactNumber,
        date,
        slotNumber,
        message,
        participants,
        appointmentNumber,
        status: 'pending',
        totalAmount : therapist.consultationFee ? therapist.consultationFee : 1000
        });

        

        /* -------create new order ----------- */
        const options = {
            amount: newAppointment.totalAmount*100,//1000, // amount in paise (e.g., 1000 paise = ₹10)
            currency: 'INR',
            receipt: newAppointment._id,//'order_receipt',
            payment_capture: 1,
        };
        const order = await razorpay.orders.create(options);

        /* -------create new order ----------- */
        const newRazorpayOrder = new RazorpayOrder(order);

        newAppointment.razorpayOrder = newRazorpayOrder._id;
        newAppointment.status = 'processing';

        await newAppointment.save();
        await newRazorpayOrder.save();

        if (order && newAppointment) {
            return next(CreateSuccess(200, "Appointment booking started.",{ orderId:order.id, orderAmount:order.amount, orderReceipt:order.receipt }));
        }
        return next(CreateError(500, "Failed to book appointment."));
       
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while trying to book appointment."));
    }
}

module.exports.getBookedSlots = async (req, res, next)=> {
    try {
        console.log(req.params);
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user) {
            return next(CreateError(404, "User not found"));
        }

        const therapistId = req.params.therapistId;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist || therapist.isDeleted || !therapist.isApproved || !therapist.isVerified || therapist.isBlocked) {
            return next(CreateError(404, "Therapist not availabale"));
        }
        const date = req.params.date;
        const startOfDay = new Date(date);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Ensure we are excluding cancelled appointments in our search

        const therapistAppointments = await Appointment.find({
            therapistId: therapistId,
            date : {$gte: startOfDay, $lte: endOfDay},
            status: { $nin: ['cancelled', 'pending'] }
        }).select('slotNumber -_id');

        const userAppointments = await Appointment.find({
            clientId: userId,
            date : {$gte: startOfDay, $lte: endOfDay},
            status: { $nin: ['cancelled', 'pending'] }
        }).select('slotNumber -_id');
        
        const bookedSlots = {
            therapistBooked: therapistAppointments.map(a=> a.slotNumber),
            userBooked: userAppointments.map(a=> a.slotNumber)
        }

        console.log(bookedSlots);

        return next(CreateSuccess(200, "Fetched booked slots successfully.", bookedSlots));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching booked slots."));
    }
}

module.exports.getAppointmentList = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        console.log('ello', userId);
        const user = await User.findById(userId);
        if(!user) {
            return next(CreateError(404, "User not found"));
        }

        const now = new Date();

        const userAppointments = await Appointment.find({
            clientId:userId, 
            date: {$gte: now} , 
            status: {$nin: ['cancelled', 'pending']}
        }).sort('date')
          .populate('therapistId', 'fullName')
          .exec();

        const userAppointmentsDetails = userAppointments.map(appointment => {
            return {
                appointmentId: appointment._id,
                therapistName : appointment.therapistId.fullName ,
                myContactNumber: appointment.clientContactNumber,
                slotNumber: appointment.slotNumber ,
                status: appointment.status,
                participants: appointment.participants,
                appointmentNumber: appointment.appointmentNumber,
                date: appointment.date,
                message: appointment.message,
                therapistPeerId: appointment.therapistPeerId
            };          
        });
        console.log(userAppointmentsDetails);
        return next(CreateSuccess(200, "Appointment list fetched successfully.", userAppointmentsDetails))
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching appointment list."));
    }
}

module.exports.getCancelledAppointments = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        console.log('inside cancelled appointments', userId);
        const user = await User.findById(userId);
        if(!user) {
            return next(CreateError(404, "User not found"));
        }

        const now = new Date();

        const userAppointments = await Appointment.find({
            clientId:userId, 
            date: {$gte: now} , 
            status: 'cancelled'
        }).sort('date')
          .populate('therapistId', 'fullName')
          .exec();

        const userAppointmentsDetails = userAppointments.map(appointment => {
            return {
                appointmentId: appointment._id,
                therapistName : appointment.therapistId.fullName ,
                myContactNumber: appointment.clientContactNumber,
                slotNumber: appointment.slotNumber ,
                status: appointment.status,
                participants: appointment.participants,
                appointmentNumber: appointment.appointmentNumber,
                date: appointment.date,
                message: appointment.message
            };          
        });
        console.log(userAppointmentsDetails);
        return next(CreateSuccess(200, "Appointment list fetched successfully.", userAppointmentsDetails))
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching appointment list."));
    }
}

module.exports.cancelAppointment = async (req,res,next) => {
    try {
        const userId = req.query.id;
        
        const user = await User.findById(userId);
        if(!user) {
            return next(CreateError(404, "User not found"));
        }
        
        const appointmentId = req.params.appointmentId;
        
        const appointment = await Appointment.findById(appointmentId);
        if(!appointment) {
            return next(CreateError(405, "This appointment is not found"));
        }

        const paymentId = appointment.razorpayPayment.razorpay_payment_id;
        const amount = appointment.totalAmount*100;

        console.log('Appointmendt details: ', appointment);

        if(!appointment.razorpayOrder){
            const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
                $set: { status: 'cancelled' }
            });
            return next(CreateSuccess(200, 'Appointment CAncelled successfully'));
        }

        if(!paymentId || !amount){
            return next(CreateError(405, "Unable to make refunds"));
        }

        console.log('cancelAppointment', paymentId, {"amount": `${amount}`} );

        const refundResponse = await razorpay.payments.refund(paymentId,{
            "amount": amount,
            "speed": "normal",
            "notes": {
              "notes_key_1": "Cancelled appointment",
            },
            //"receipt": "Receipt No. 31"
          });

          console.log("let's check the refund status: ",refund);
          if(refundResponse.status==='processed'){
            appointment.status = 'cancelled';
            await appointment.save();
            return next(CreateSuccess(200, "Appointment cancelled successfully"));
          }else if(refundResponse.status==='cancelled') {
            return next(CreateError(403, "Refund cancelled. Please try again"));
          }
          if(refundResponse.error){
            return next(CreateError(403, "Failed to make refunds. Please try again"));
          }
          


        /* const wallet = user.wallet ? user.wallet+appointment.totalAmount : appointment.totalAmount;

        user.wallet = wallet;
        await user.save();

        const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
            $set: { status: 'cancelled' }
        });

        if(updatedAppointment){
            return res.status(200).send({ message: "Appointment has been cancelled and refunded successfully." });
        } */

        /* try {
            const refund = await razorpay.payments.refund({
                payment_id: paymentId,
                amount: amount
            });
            console.log('refund success', refund);

            const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
                $set: { status: 'cancelled' }
            });

            if (updatedAppointment) {
                return res.status(200).send({ message: "Appointment has been cancelled and refunded successfully." });
            } else {
                throw new Error("Failed to update appointment status.");
            }
        } catch (err) {
            console.error('Refund or appointment update failed:', err);
            return next(CreateError(500, "Refund failed: " + err.message));
        } */ 
        /* const options = {
            paymentId: paymentId,
            amount: amount
        };

        //console.log('razorpay: ', razorpay);
        let updatedAppointment, refund=false;
        razorpay.payments.refund(options, (err, refund) => {
            if (err) {
              // Handle the error
              console.log('refund failed');
            } else {
              // The refund was successful
              console.log('refund success');
              refund=true;
            }
          }); */
        //console.log('razorpayResponse:', razorpayResponse);
        
        /* if (refund) {
            updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {$set: {status:'cancelled'}});
        } */
        
        /* if(updatedAppointment)
        {
            return next(CreateSuccess(200, "Appointment has been cancelled successfully."));
        } */
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while cancelling the appointment."));
    }
}

module.exports.createAppointmentOrder = async (req,res,next)=>{
    const amount =req.body.amount;
    const receipt = req.body.receipt;

    if(!amount && amount<1000){
        return next(CreateError(407, 'Amount is required and shoub be above 1000.'));
    }
    if(!receipt){
        return next(CreateError(407, 'Receipt is not found'));
    }
    const options = {
        amount: amount*100,//1000, // amount in paise (e.g., 1000 paise = ₹10)
        currency: 'INR',
        receipt: receipt,//'order_receipt',
        payment_capture: 1,
    };
    try {
        const order = await razorpay.orders.create(options);
        return next(CreateSuccess(200, "Created Razorpay Appointment Order Successfully", { orderId: order.id, amount: 1000}));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while creating razorpay order."));
    }
}
const therapistOrSlotValid = async (therapistId,userId,date, slotNumber)=>{
    try {
        const therapist = await Therapist.findById(therapistId);
        if(!therapist || !therapist.isVerified || !therapist.isApproved || therapist.isDeleted || therapist.isBlocked){
            return false;
        }
        const user = await User.findById(userId);
        if(!user){
            return false
        }

        const existingAppointmentForTherapist = await Appointment.findOne({
            therapistId,
            date,
            slotNumber,
            status: {$nin: ['cancelled', 'pending']}
        });

        if(existingAppointmentForTherapist){
            return false;
        }

        const existingAppointmentbyUser = await Appointment.findOne({
            clientId: userId,
            date,
            slotNumber,
            status: {$nin: ['cancelled', 'pending']}
        });
        if(existingAppointmentbyUser){
            return false;
        }

        return true;
        
    } catch (error) {
        console.log(error.message);
        return false;
    } 
}

module.exports.appointmentPaymentSuccess = async (req,res,next)=>{
    try {
        const { razorpayPayment, razorpayOrder } = req.body;
        const appointmentId = razorpayOrder.orderReceipt;
        const appointment = await Appointment.findById(appointmentId).populate('razorpayOrder', 'id');
        if(!appointment){
            console.log('appointment not found ');
            return next(CreateError(400, "Appointment booking has been terminated."));
        }

        if (!therapistOrSlotValid()) {
            return next(CreateError(400, "Appointment booking terminated as therapist or slot is unavailable right now."));
        }

        
        let updatedAppointment;
        if (appointment) {
            appointment.razorpayPayment = razorpayPayment;
            updatedAppointment = await appointment.save();
        }          

        console.log('razorpayPayment in payment success route:', razorpayPayment, updatedAppointment);

        const serverOrderId = appointment.razorpayOrder.id;
        const paymentId = razorpayPayment.razorpay_payment_id;
        console.log('serverOrderId:', serverOrderId);
        console.log('paymentId:', paymentId);

        const generated_signature = hmac_sha256(serverOrderId + "|" + paymentId, process.env.RAZORPAY_KEY_SECRET);

        if(generated_signature === razorpayPayment.razorpay_signature){
            const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {$set: {status:'scheduled'}});
            if (updatedAppointment) {
                return next(CreateSuccess(200, "Appointment Booked"));
            }
        }

        return next(CreateError(400, "Payment Failed."));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while making razorpay payment."));
    }   
}

module.exports.appointmentPaymentCancel = async (req,res,next)=>{
    try {
        return next(CreateSuccess(200, "Payment Cancelled."));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while cancelling payment."));
    }   
}

module.exports.getOldChats = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user || !user.isVerified || user.isBlocked || user.isDeleted){
            return next(CreateError(401, "User is unavailable"));
        }
        const oldChats = await Chat.find({userId: user._id});
        return next(CreateSuccess(200, "Old chats fetched successfully", oldChats));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching old chats."));
    }
}

module.exports.walletPayment = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        
        const user = await User.findById(userId);
        if(!user || !user.isVerified || user.isBlocked || user.isDeleted) {
            return next(CreateError(404, "User not available"));
        }

        return next(CreateSuccess(200, "Wallet paymnt success")); ``
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while making wallet payment."));
    }
}

module.exports.loadUserProfile = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user || !user.isVerified || user.isBlocked || user.isDeleted) {
            return next(CreateError(404, "User not available"));
        } 
        userProfileDetails = {
            fullName: user.fullName,
            email: user.email, 
            userName: user.userName, 
            profileImage: user.profileImage, 
            phoneNo: user.phoneNo,
            age: user.age, 
            gender: user.gender, 
            location: user.location, 
            bio: user.bio, 
            interests: user.interests,
            workStatus: user.workStatus,
            education: user.education
        }
        console.log('lets check user profile details', userProfileDetails);
        return next(CreateSuccess(200, "Successfully fetched user profile details.", userProfileDetails))
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while user profile details."));
    }
}

module.exports.editUserProfile = async (req,res, next)=>{
    try {
        const phoneRegex = /^[6-9]\d{9}$/;
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user || !user.isVerified || user.isBlocked || user.isDeleted) {
            return next(CreateError(404, "User not available"));
        } 
        
        const updateInfo = req.body.editProfileObj;
        console.log('inisde edit user profile: ', updateInfo);
        
        if (updateInfo.profileImage && updateInfo.profileImage.trim()!=='') {
            user.profileImage = updateInfo.profileImage;
        }
        if (updateInfo.fullName && updateInfo.fullName.trim()!=='') {
            user.fullName = updateInfo.fullName;
        }
        if (updateInfo.location && updateInfo.location.trim()!=='') {
            user.location = updateInfo.location;
        }
        if (updateInfo.phoneNo && updateInfo.phoneNo.trim()!=='') {
            if(!phoneRegex.test(updateInfo.phoneNo)){
                return next(CreateError(400, "Invalid phone number format. It should be a 10-digit number starting with 6-9."))
            }
            user.phoneNo = updateInfo.phoneNo;
        }
        if (updateInfo.workStatus && updateInfo.workStatus.trim()!=='') {
            user.workStatus = updateInfo.workStatus;
        }
        if (updateInfo.education && updateInfo.education.trim()!=='') {
            user.education = updateInfo.education;
        }
        if (updateInfo.bio && updateInfo.bio.trim()!=='') {
            user.bio = updateInfo.bio;
        }
        await user.save();
        const userProfileDetails = {
            profileImage : user.profileImage,
            fullName: user.fullName,
            location: user.location,
            phoneNo: user.phoneNo,
            workStatus: user.workStatus,
            education: user.education,
            bio: user.bio
        }
        return next(CreateSuccess(200, 'User profile updated successfully!', userProfileDetails))
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while editing user profile."));
    }
}

module.exports.viewTherapistsList = async (req,res,next)=>{
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        if(!user || !user.isVerified || user.isBlocked || user.isDeleted) {
            return next(CreateError(401, "User not available"));
        } 

        const therapistList = await Therapist.find({
            isVerified: true, 
            isBlocked: {$ne:true}, 
            isDeleted: {$ne:true}, 
            isApproved: true,
            availability: {$exists: true, $not: {$size: 0}}
        }, 
        {
            fullName:1, 
            profileImage:1,
            specializations:1, 
            _id:0
        });
        if (therapistList) {
            return next(CreateSuccess(200, "Therapist list fetched successfully", therapistList));
        } else {
            return next(CreateError(404, "Failed to fetch therapist list"));
        }
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching therapist list."));
    }
}