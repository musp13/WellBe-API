const User = require('../models/userModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { generateOTP } = require('../utils/otpGenerator.js')

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

const baseUrl = process.env.BASE_URL;

const sendVerifyMail=async (name,email,user_id)=>{
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
};

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
            return next(CreateError(403, "Full Name should have more than 3 characters"));
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
        console.log(`inside verifymail req.body ${req.body.otp} and req.query = ${req.query.userId}`);
        
        const user = await User.findById(req.query.userId);
        //console.log('check id user is found', user);
        if(user.isVerified)
        {
            return next(CreateSuccess(200,'User as been already verified.'))
        }
        const enteredOTP = req.body.otp;
        if (user.OTP == enteredOTP) {
            const updateInfo = await User.updateOne({_id:req.query.userId},{$set:{isVerified:true, OTP: null}});
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

        if (err.code === 11000) {
            errorMessage = "Email has already been verified.";
        }

        return next(CreateError(406, errorMessage));
    }
}

module.exports.resendOTP = async (req,res,next)=>{
    try {
        const user = await User.findById(req.body.userId);
        if(user)
        {
            if(user.isVerified)
            {
                return next(CreateError(403, 'User has been already verified'))
            }
            const OTP = await sendVerifyMail(user.fullName,user.email,user._id);
            await User.findByIdAndUpdate({_id:user._id},{$set:{OTP: OTP}});
            return next(CreateSuccess(200, 'OTP has been resent.'));
        }
        else
        {
            return next(CreateError(406, 'OTP resend Failed!'))
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports.userLogin = async (req,res,next)=>{
    try {
        const user = await User.findOne({email: req.body.email});
        
        if(!user)
        {
            return next(CreateError(404,'User not found'))
        }
        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password);
        if(!isPasswordCorrect)
        {
            return next(CreateError(400,'Password is incorrect'));
        }

        if(!user.isVerified)
        {
            return next(CreateError(401,'User is not verified'));
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
