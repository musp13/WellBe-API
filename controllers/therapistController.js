const Therapist = require('../models/therapistModel.js');
const TherapistToken = require('../models/therapistTokenModel.js');
const TherapistOtp = require('../models/therapistOtpModel.js');
const Appointment = require('../models/appointmentModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { sendVerifyMail } = require('../utils/sendVerifyMail.js');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

const baseUrl = process.env.BASE_URL;

/* const sendVerifyMail=async (name,email,therapist_id)=>{
    try
    {
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
            html:`<p>Hi ${name}. Please click here to <a href="${baseUrl}verify_therapist?id=${therapist_id}">verify your email</a>. </p>`
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
    }
    catch(err)
    {
        console.log(err.message);
    }
}; */

/* module.exports.therapistRegister = async (req,res,next)=>{
    try {
        const therapist = await Therapist.findOne({$or:[{email: req.body.email}, {userName: req.body.userName}]});
        if(therapist)
        {
            return next(CreateError(400, "Email already registered"));
        }
        if(req.body.fullName.trim().length<3)
        {
            return next(CreateError(403, "Full Name should have atleast 3 characters"));
        }
        if(req.body.password != req.body.confirmPassword)
        {
            return next(CreateError(401, "Passwords do not match"));
        }
        if(req.body.password.trim().length<8)
        {
            return next(CreateError(401, "Password should be atleast 8 characters"));
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newTherapist = new Therapist({
            fullName:req.body.fullName,
            email: req.body.email,
            userName: req.body.userName,
            password: hashedPassword
        });

        await newTherapist.save();

        if(newTherapist)
        {
            sendVerifyMail(req.body.fullName,req.body.email,newTherapist._id);
            return next(CreateSuccess(200, 'Regsitration Successful. Please verify your Email.'));
        }
        else
        {
            return next(CreateError(406, 'Regsitration Failed!'))
        }

    } catch (error) {
        console.log(error.message);
    }
} */

module.exports.verifyMail = async (req,res,next)=>{
    try
    {
        const therapist = await Therapist.findById(req.query.therapistId);
        
        
        if(therapist.isVerified)
        {
            return next(CreateSuccess(200,'User has been already verified.'))
        }

        const OTP = await TherapistOtp.findOne({userId:therapist._id});

        if(!OTP){
            return next(CreateError(402, "OTP has been expired"));
        }     
        const enteredOTP = req.body.otp;
        console.log(OTP.OTP, enteredOTP);   
        if (OTP.OTP === enteredOTP) {
            const updateInfo = await Therapist.updateOne({_id:req.query.therapistId},{$set:{isVerified:true}});
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
        const therapist = await Therapist.findById(req.body.therapistId);
        if(!therapist)
            return next(CreateError(404, "User not found"));

        if(therapist)
        {
            if(therapist.isVerified)
            {
                return next(CreateError(403, 'User has been already verified'))
            }
            const OTP = await sendVerifyMail(therapist.fullName,therapist.email,therapist._id);
            //await Therapist.findByIdAndUpdate({_id:therapist._id},{$set:{OTP: OTP}});
            
            otpExists = await TherapistOtp.findOne({userId:therapist._id});

            if(otpExists)
            {
                await TherapistOtp.findOneAndDelete({userId:therapist._id}); 
            }
            
            const newTherapistOtp = new TherapistOtp({
                userId: therapist._id,
                OTP: OTP
            });

            await newTherapistOtp.save();

            if(newTherapistOtp)
                return next(CreateSuccess(200, 'OTP has been resent.'));
            else
                return next(CreateSuccess(402, 'Failed to resed OTP.'));
        }
        else
        {
            return next(CreateError(406, 'OTP resend Failed!'));
        }
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, 'Something went wrong!'))
    }
}

module.exports.therapistLogin = async (req,res,next)=>{
    try {
        console.log('inside therapist login,check re.body: ', req.body);
        const therapist = await Therapist.findOne({email: req.body.email});
        if(!therapist)
        {
            return next(CreateError(404,'Invalid Credentials'))//User not found
        }
        if(therapist.isDeleted)
        {
            return next(CreateError(406,'User is deleted'));
        }
        
        const isPasswordCorrect = await bcrypt.compare(req.body.password, therapist.password);
        
        if(!isPasswordCorrect)
        {
            console.log('working fine', isPasswordCorrect);
            return next(CreateError(408,'Invalid Credentials'))//Password is incorrect
        }
        
        if(therapist.isBlocked)
        {
            return next(CreateError(402,'User is blocked'));
        }

        if(!therapist.isVerified)
        {
            return next(CreateError(402,'User is not verified!'));
        }
        const token = jwt.sign(
            {id: therapist._id, isTherapist: true},
            process.env.JWT_SECRET
        );

        //req.session.access_token = token;
        //req.session.cookie.access_token=token;
        const therapistData = {
            therapistId : therapist._id,
            userName: therapist.userName,
            email : therapist.email
        }
        
        res.cookie("therapist_access_token", token, {httpOnly: true, maxAge:24*60*60*1000})
           .status(200)
           .json({
                status: 200,
                message: "Login Success",
                data: therapistData,
                therapist_token: token
           });

    } catch (error) {
            return next(CreateError(500,error.message));
    }
}

module.exports.therapistLogout = (req,res,next)=>{
    res.cookie("therapist_access_token","",{maxAge:0});
    return next(CreateSuccess(200,'User logged out'));
}

module.exports.getTherapistId = async (req, res, next)=>{
    try {
        const therapist = await Therapist.findOne({email: req.body.email});
        
        if(!therapist)
        {
            return next(CreateError(404,'Invalid Credentials'))//User not found
        }
        const isPasswordCorrect = await bcrypt.compare(req.body.password, therapist.password);
        if(!isPasswordCorrect)
        {
            return next(CreateError(400,'Invalid Credentials'));//Password is incorrect
        }
        if(!therapist.isVerified)
        {
            return next(CreateSuccess(201,'User is not verified!',{therapistId: therapist._id}));
        } 
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, 'Something went wrong!'))
    }
}

module.exports.sendResetEmail = async (req,res,next)=>{
    console.log('inside therapist send  reset email', req.body.email)
    const email = req.body.email;
    const therapist = await Therapist.findOne({email: email}); // 
    if(!therapist)
    {
        return next(CreateError(404,'User not found'))//User not found
    }
    const payload = {
        email : therapist.email
    }
    const expiryTime = 300;
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: expiryTime});

    const newToken = new TherapistToken({
        userId: therapist._id,
        token: token
    });
    
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
        subject:'For Password Reset',
        html: `<p>Hi ${therapist.fullName}. You can reset your password now. Click <a href="${process.env.BASE_URL_CLIENT}/therapist/reset_password/${token}">here</a><p>`
        //html:`<p>Hi ${name}. Please click here to <a href="${baseUrl}verify_user?id=${user_id}">verify your email</a>. </p>`
    }
    transporter.sendMail(mailOptions,async (error,info)=>{
        if(error)
        {
            console.log(error);
            return next(CreateError(500, "Something went wrong while sending the email."))
        }
        else
        {
            await newToken.save();
            console.log("Email has been sent.",info.response);
            return next(CreateSuccess(200, "Email has been sent."));
        }
    })
}

module.exports.resetPassword = async (req, res, next)=>{
    console.log('inside reset password', req.body.resetObj.token);
    const token = req.body.resetObj.token;
    const newPassword = req.body.resetObj.password;
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, data)=>{
        if(err){
            //console.log(err);
            return next(CreateError(500, "Reset Link is Expired"));
        }
        else{
            const response = data;
            const therapist = await Therapist.findOne({email: response.email}); // 
            if(!therapist)
            {
                return next(CreateError(404,'User not found'))//User not found
            } 

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            therapist.password = hashedPassword;

            try {
                const updatedTherapist = await Therapist.findOneAndUpdate({_id: therapist._id}, {$set: therapist}, {new: true});
                return next(CreateSuccess(200, "Password reset Success"));
            } catch (error) {
                console.log(error.message);
                return next(CreateError(500, "Something went wrong while resetting the password."))
            }
        }
    })
}

module.exports.setOtp = async (req,res,next)=>{
    try {
        const therapistId = req.params.therapistId;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist)
            return next(CreateError(404, "User not found"));

        const OTP = await sendVerifyMail(therapist.fullName,therapist.email, therapist._id);

        otpExists = await TherapistOtp.findOne({userId:therapist._id});

        if(otpExists)
        {
            await TherapistOtp.findOneAndDelete({userId:therapist._id}); 
        }
            
        const newTherapistOtp = new TherapistOtp({
            userId: therapist._id,
            OTP: OTP
        });

        const newOTP = await newTherapistOtp.save();

        if(newOTP)
        {
            console.log(" new otp: ", newOTP);
            return next(CreateSuccess(200, "OTP has been set!"));
        }
        return next(CreateError(400, "Failed to set OTP!"));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while setting the OTP."));
    }
}

module.exports.getTherapistDetails = async (req,res,next)=>{
    try {
        const therapistId = req.params.therapistId;
        const therapist = await Therapist.findById(therapistId, {
            _id:0, 
            isDeleted: 0, 
            password:0,
            reviews: 0,
            isVerified: 0,
            OTP: 0,
            isBlocked: 0,
            isDeleted: 0,
            createdAt: 0,
            updatedAt: 0  
        });

        if(!therapist) {
            return next(CreateError(404, 'User not found'));
        }

        return next(CreateSuccess(200, 'Therapist details fetched successfully', {therapistDetails: therapist}));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the user details."))
    }
}

module.exports.setAvailability = async ( req,res,next)=>{
    try {
        const therapistId = req.query.id;
        //console.log('id:', therapistId);
        const therapist = await Therapist.findById(therapistId);

        if(!therapist)
        {
            return next(CreateError(404, "User not Found"));
        }

        availability = req.body;
        console.log(availability);

        if(availability.length === 0 )
        {
            return next(CreateError(403, "No availabilities added. Please chose your available slot"));
        }

        updatedTherapist = await Therapist.findByIdAndUpdate(therapistId, {$set:{availability:availability}});

        if(updatedTherapist) {
            return next(CreateSuccess(200, "Updated Available slots successfully"));
        }

        return next(CreateError(403, "Failed to update available slots"));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while setting availability."))
    }
}

module.exports.addLeave = async (req,res, next)=>{
    try {
        const therapistId = req.query.id;
        //console.log('id:', therapistId);
        const therapist = await Therapist.findById(therapistId);

        if(!therapist)
        {
            return next(CreateError(404, "User not Found"));
        }

        const { leaveDate, startTime, endTime, reason, shift } = req.body;

        if (!leaveDate) {
            return next(CreateError(400, 'Leave date is required' ));
        }

        if(!startTime || !endTime) {
            return next(CreateError(402, 'Start time and end time is required' ));
        }

        const parsedLeaveDate = new Date(leaveDate);

        if(isNaN(parsedLeaveDate.getTime())) {
            return next(CreateError(402, 'Invalid leave date format' ));
        }

        const isLeaveExist = therapist.leave.some(leave=> leave.leaveDate.getTime() === parsedLeaveDate.getTime());

        if(isLeaveExist){
            return next(CreateError(403, 'Leave for this date already exists'));
        }

        const leave = {
            leaveDate : parsedLeaveDate,
            startTime : startTime || '',
            endTime : endTime || '',
            shift: shift

        }

        const updatedTherapist = await Therapist.findByIdAndUpdate(therapistId, {$push: {leave: leave}}, {new: true});

        if(updatedTherapist) {
            return next(CreateSuccess(200, "Your leave has been added successfully"));
        }

        return next(CreateError(403, "Failed to mark your leave"));
        //console.log(req.body);
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while adding your unavailability."))
    }
}

module.exports.getMyAvailability = async (req,res,next)=>{
    try {
        console.log('thrapistId', req.query.id);
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        return next(CreateSuccess(200, "Fetched therapist availability successfully", therapist.availability));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the availability."))
    }
}

module.exports.getMyLeave = async (req,res,next)=>{
    try {
        console.log('thrapistId', req.query.id);
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        return next(CreateSuccess(200, "Fetched therapist leave dates successfully", therapist.leave));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the leave dates."))
    }
}

module.exports.removeLeaveDate = async (req,res,next)=>{
    try {
        
        console.log('thrapistId', req.query.id);
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }

        const leaveDate = new Date(req.body.date);
        
        const leaveIndex = therapist.leave.findIndex(leave=> leave.leaveDate.getTime() === leaveDate.getTime());

        //console.log('leaveIndex:', leaveIndex);

        if(leaveIndex !== -1){
            therapist.leave.splice(leaveIndex, 1);
            await therapist.save();
            return next(CreateSuccess(200, 'leaveDate removed successfully'));
        }

        return next(CreateError(404, 'Leave date not found.'));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while removing the leave date."))
    }
}

module.exports.getAppointmentList = async (req,res,next)=>{
    try {
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        
        const now = new Date();

        const therapistAppointments = await Appointment.find({
            therapistId:therapistId, 
            date: {$gte: now} , 
            status: {$nin: ['cancelled', 'pending']}
        }).sort('date')
          .populate('clientId', 'fullName')
          .exec();

          const therapistAppointmentsDetails = therapistAppointments.map(appointment => {
            return {
                appointmentId: appointment._id,
                clientName : appointment.clientId.fullName ,
                clientContactNumber: appointment.clientContactNumber,
                slotNumber: appointment.slotNumber ,
                status: appointment.status,
                participants: appointment.participants,
                appointmentNumber: appointment.appointmentNumber,
                date: appointment.date,
                message: appointment.message
            };          
        });
        console.log(therapistAppointmentsDetails);

        if(therapistAppointmentsDetails) {
            return next(CreateSuccess(200, "Fetched therapist appointments successfully", therapistAppointmentsDetails));
        }
        
        return next(CreateError(400, "Failed to fetch appointments."));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the appointments."));
    }
}

module.exports.getCancelledAppointments = async (req,res,next)=>{
    try {
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        
        const now = new Date();

        const therapistAppointments = await Appointment.find({
            therapistId:therapistId, 
            date: {$gte: now} , 
            status: 'cancelled'
        }).sort('date')
          .populate('clientId', 'fullName')
          .exec();

          const therapistAppointmentsDetails = therapistAppointments.map(appointment => {
            return {
                appointmentId: appointment._id,
                clientName : appointment.clientId.fullName ,
                clientContactNumber: appointment.clientContactNumber,
                slotNumber: appointment.slotNumber ,
                status: appointment.status,
                participants: appointment.participants,
                appointmentNumber: appointment.appointmentNumber,
                date: appointment.date,
                message: appointment.message
            };          
        });
        console.log(therapistAppointmentsDetails);

        if(therapistAppointmentsDetails) {
            return next(CreateSuccess(200, "Fetched therapist appointments successfully", therapistAppointmentsDetails));
        }
        
        return next(CreateError(400, "Failed to fetch appointments."));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching the appointments."));
    }
}

module.exports.cancelAppointment = async (req,res,next) => {
    try {
        const therapistId = req.query.id;
        console.log('cancelAppointment', therapistId);
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        
        const appointmentId = req.params.appointmentId;
        

        const appointment = await Appointment.findById(appointmentId);
        if(!appointment) {
            return next(CreateError(405, "This appointment is not found"));
        }

        const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {$set: {status:'cancelled'}});

        if(updatedAppointment)
        {
            return next(CreateSuccess(200, "Appointment has been cancelled successfully."));
        }
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while cancelling the appointment."));
    }
}

module.exports.editProfile = async (req,res,next) => {
    try {
        const therapistId = req.query.id;
        const therapist = await Therapist.findById(therapistId);
        if(!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }
        const editFormDetails = req.body;        
        console.log('editFormDetails: ', editFormDetails);

        const { editProfileObj } = req.body;
        const updateObject = {};

        if (editProfileObj.fullName && editProfileObj.fullName.trim()){
            updateObject.fullName = editProfileObj.fullName;
        }

        if (editProfileObj.userName && editProfileObj.userName.trim()){
            updateObject.userName = editProfileObj.userName;
        }

        if (editProfileObj.profileImage && editProfileObj.profileImage.trim()){
            updateObject.profileImage = editProfileObj.profileImage;
        }

        if (editProfileObj.bio && editProfileObj.bio.trim()){
             updateObject.bio = editProfileObj.bio;
        }

        if (editProfileObj.consultationFee){
            updateObject.consultationFee = parseInt(editProfileObj.consultationFee);
        } 

        updateObject.qualifications = [];
        if (editProfileObj.qualification1 && editProfileObj.qualification1.trim()){
            updateObject.qualifications.push({ degree: editProfileObj.qualification1 });
        } 
        if (editProfileObj.qualification2 && editProfileObj.qualification2.trim()){
            updateObject.qualifications.push({ degree: editProfileObj.qualification2 });
        } 
        if (editProfileObj.qualification3 && editProfileObj.qualification3.trim()){
            updateObject.qualifications.push({ degree: editProfileObj.qualification3 });
        } 

        updateObject.specializations = [];
        if (editProfileObj.specialization1 && editProfileObj.specialization1.trim()) {
            updateObject.specializations.push(editProfileObj.specialization1);
        }    
        if (editProfileObj.specialization2 && editProfileObj.specialization2.trim()) 
            updateObject.specializations.push(editProfileObj.specialization2);
        if (editProfileObj.specialization3 && editProfileObj.specialization3.trim()) 
            updateObject.specializations.push(editProfileObj.specialization3);

        updateObject.experiences = [];
        if (editProfileObj.experienceCompany1 && editProfileObj.experienceCompany1.trim() && editProfileObj.experienceStartDate1 && editProfileObj.experienceEndDate1) {
            updateObject.experiences.push({
                company: editProfileObj.experienceCompany1,
                startDate: new Date(editProfileObj.experienceStartDate1),
                endDate: new Date(editProfileObj.experienceEndDate1)
            });
        }

        if (editProfileObj.experienceCompany2 && editProfileObj.experienceCompany2.trim() && editProfileObj.experienceStartDate2 && editProfileObj.experienceEndDate2) {
            updateObject.experiences.push({
                company: editProfileObj.experienceCompany2,
                startDate: new Date(editProfileObj.experienceStartDate2),
                endDate: new Date(editProfileObj.experienceEndDate2)
            });
        }

        if (editProfileObj.experienceCompany3 && editProfileObj.experienceCompany3.trim() && editProfileObj.experienceStartDate3 && editProfileObj.experienceEndDate3) {
            updateObject.experiences.push({
                company: editProfileObj.experienceCompany3,
                startDate: new Date(editProfileObj.experienceStartDate3),
                endDate: new Date(editProfileObj.experienceEndDate3)
            });
        }

        const updatedTherapist = await Therapist.findOneAndUpdate(
            { _id: therapistId }, 
            { $set: updateObject },
            { new: true } 
        );

        console.log('lets check updateObj', updateObject);
        console.log('lets check updatedTherapist', updatedTherapist);
    
        if(updatedTherapist)
            return next(CreateSuccess(200, "Your profile has been edited successfully."));

        return next(CreateError(400, "Failed to update the therapist."));
        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while editing the profile."));
    }
}

module.exports.saveRoomId = async (req,res,next)=>{
    try {
        const therapistId = req.query.id;
        const { appointmentId, roomId } = req.body; 
        const appointment = await Appointment.findById(appointmentId);
        console.log('helloooowww', req.body);
        if(appointment.therapistId.toString() !== therapistId){
            return next(CreateError(403, "You don't have access to this appointment"));
        }

        existingRoomIds = await Appointment.find({},{roomId:1, _id:0});
        existingRoomIdsArray = existingRoomIds.map(idObject=> idObject.roomId);
        if(existingRoomIdsArray.includes(roomId)){
            return next(CreateError(403, "This room ID already exists. choose a different room ID"));
        }

        appointment.roomId = roomId;
        await appointment.save();
        
        return next(CreateSuccess(200, "RoomId saved successfully"));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while saving the room id."));
    }
}

module.exports.saveTherapistPeerId = async (req,res,next)=>{
    try {
        console.log('hello inside saveTherapistPeerId');
        const therapistId = req.query.id;
        const { appointmentId, peerId } = req.body; 
        const appointment = await Appointment.findById(appointmentId);
        console.log('inside saveTherapistPeerId', req.body);
        if(appointment.therapistId.toString() !== therapistId){
            return next(CreateError(403, "You don't have access to this appointment"));
        }

        appointment.therapistPeerId = peerId;
        await appointment.save();
        
        return next(CreateSuccess(200, "PeerId saved successfully"));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while saving the peer id."));
    }

}

module.exports.removeTherapistPeerId = async (req,res,next)=>{
    try {
        console.log('hello inside removeTherapistPeerId');
        const therapistId = req.query.id;
        const { appointmentId } = req.body; 
        const appointment = await Appointment.findById(appointmentId);
        console.log('inside removeTherapistPeerId', req.body);
        if(appointment.therapistId.toString() !== therapistId){
            return next(CreateError(403, "You don't have access to this appointment"));
        }

        appointment.therapistPeerId = null;
        await appointment.save();
        
        return next(CreateSuccess(200, "PeerId removed successfully"));
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while removing the peer id."));
    }

}

