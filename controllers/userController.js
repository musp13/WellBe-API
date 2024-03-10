const User = require('../models/userModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');

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
            html:`<p>Hi ${name}. Please click here to <a href="${baseUrl}verify_user?id=${user_id}">verify your email</a>. </p>`
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
};

module.exports.userRegister = async (req,res,next)=>{
    try {
        const user = await User.findOne({email: req.body.email});
        if(user)
        {
            return next(CreateError(400, "Email already registered"));
        }
        if(req.body.password != req.body.confirmPassword)
        {
            return next(CreateError(401, "Passwords do not match"));
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
            sendVerifyMail(req.body.fullName,req.body.email,newUser._id);
            return next(CreateSuccess(200, 'Regsitration Successful. Please verify your mail.'));
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
        const updateInfo = await User.updateOne({_id:req.query.id},{$set:{isVerified:true}});
        return next(CreateSuccess(200, 'Your Email has been verified. Pease log in.'));
        
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
        
        res.cookie("user_access_token", token, {httpOnly: true, maxAge:24*60*60*1000})
           .status(200)
           .json({
                status: 200,
                message: "Login Success",
                data: user,
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
