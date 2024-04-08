const Therapist = require('../models/therapistModel.js');


const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { sendVerifyMail } = require('../utils/sendVerifyMail.js');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const TherapistToken = require('../models/therapistTokenModel.js');

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
        
        const enteredOTP = req.body.otp;
        if (therapist.OTP === enteredOTP) {
            const updateInfo = await Therapist.updateOne({_id:req.query.therapistId},{$set:{isVerified:true, OTP: null}});
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
        if(therapist)
        {
            if(therapist.isVerified)
            {
                return next(CreateError(403, 'User has been already verified'))
            }
            const OTP = await sendVerifyMail(therapist.fullName,therapist.email,therapist._id);
            await Therapist.findByIdAndUpdate({_id:therapist._id},{$set:{OTP: OTP}});
            return next(CreateSuccess(200, 'OTP has been resent.'));
        }
        else
        {
            return next(CreateError(406, 'OTP resend Failed!'));
        }
    } catch (error) {
        console.log(error.message);
        return next(CreateError(407, 'Something went wrong!'))
    }
}

module.exports.therapistLogin = async (req,res,next)=>{
    try {
        //console.log('inside therapist login,check re.body: ', req.body);
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
            return next(CreateError(400,'Invalid Credentials'));//Password is incorrect
        }
        
        if(therapist.isBlocked)
        {
            return next(CreateError(402,'User is blocked'));
        }

        if(!therapist.isVerified)
        {
            return next(CreateError(401,'User is not verified!'));
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

