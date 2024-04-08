const Admin = require('../models/adminModel.js');
const Therapist = require('../models/therapistModel.js');
const User = require('../models/userModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { sendVerifyMail } = require('../utils/sendVerifyMail.js');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports.adminRegister = async (req,res,next)=>{
    try {
        const admin = await Admin.findOne({userName: req.body.userName});
        if(admin)
        {
            return next(CreateError(400, "Username already exists"));
        }
        if(req.body.password != req.body.confirmPassword)
        {
            return next(CreateError(401, "Passwords do not match"));
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newAdmin = new Admin({
            userName: req.body.userName,
            password: hashedPassword
        });

        await newAdmin.save();

        return next(CreateSuccess(200, 'Admin added successfully'));

    } catch (error) {
        console.log(error.message);
    }
}

module.exports.adminLogin = async (req,res,next)=>{
    try {
        const admin = await Admin.findOne({userName: req.body.userName});
        
        if(!admin)
        {
            return next(CreateError(404,'Admin not found'))
        }
        const isPasswordCorrect = await bcrypt.compare(req.body.password, admin.password);
        if(!isPasswordCorrect)
        {
            return next(CreateError(400,'Password is incorrect'));
        }
        if(!admin.isAdmin)
        {
            return next(CreateError(404,'You are not an admin'))
        }
        
        const token = jwt.sign(
            {id: admin._id, isAdmin: true},
            process.env.JWT_SECRET
        );

        //req.session.access_token = token;
        //req.session.cookie.access_token=token;
        const adminData = {
            adminId : admin._id,
            userName: admin.userName,
            isAdmin : admin.isAdmin
        }
        
        res.cookie("admin_access_token", token, {httpOnly: true, maxAge:24*60*60*1000})
           .status(200)
           .json({
                status: 200,
                message: "Login Success",
                data: adminData,
                admin_token: token
           });

    } catch (error) {
            return next(CreateError(500,error.message));//'Something went wrong!'
    }
}

module.exports.adminLogout = (req,res,next)=>{
    res.cookie("admin_access_token","",{maxAge:0});
    return next(CreateSuccess(200,'User logged out'));
}

module.exports.addTherapist = async (req, res, next)=>{
    try {
        let OTP;
        const therapist = await Therapist.findOne({$or:[{email: req.body.email}, {userName: req.body.userName}]});
        if(therapist)
        {
            return next(CreateError(400, "Email or username already registered"));
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
            
            OTP = await sendVerifyMail(req.body.fullName,req.body.email,newTherapist._id);
            await Therapist.findByIdAndUpdate({_id:newTherapist._id},{$set:{OTP: OTP}});
            return next(CreateSuccess(200, 'Therapist Added Successfully. Email Verification Required.'));
        }
        else
        {
            return next(CreateError(406, 'Therapist Regsitration Failed!'))
        }

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.getUserList = async (req,res,next)=>{
    try {
        const users = await User.find({isDeleted: {$ne:true}}).select("_id fullName userName email profileImage isVerified isBlocked");

        const userData = users.map(user=> ({
            userId: user._id.toString(),
            fullName: user.fullName,
            userName: user.userName,
            email: user.email,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            isDeleted: user.isDeleted
        }));
        return next(CreateSuccess(200, 'Users fetched retrieved successfully', {userList: userData}));
        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.getTherapistList = async (req,res,next)=>{
    try {
        const therapists = await Therapist.find({isDeleted: {$ne:true}}).select("_id fullName userName email profileImage isVerified isBlocked isApproved");

        const therapistData = therapists.map(therapist=> ({
            therapistId: therapist._id.toString(),
            fullName: therapist.fullName,
            userName: therapist.userName,
            email: therapist.email,
            profileImage: therapist.profileImage,
            isVerified: therapist.isVerified,
            isBlocked: therapist.isBlocked,
            isApproved: therapist.isApproved,
            isDeleted: therapist.isDeleted
        }));
        return next(CreateSuccess(200, 'Therapists fetched retrieved successfully', {therapistList: therapistData}));
        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.therapistApproveToggle = async (req,res,next)=>{
    try {
        console.log('inside approve toggle');
        const therapistId = req.params.therapistId;
        if (!therapistId) {
            return next(CreateError(400, "Therapist ID is required"));
        }

        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }

         // Toggle the isApproved status
         therapist.isApproved = !therapist.isApproved;

         await therapist.save();

         return next(CreateSuccess(200, 'Therapist approval status toggled successfully', {
            therapistId: therapist._id.toString(),
            isApproved: therapist.isApproved
         }));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.therapistBlockToggle = async (req,res,next)=>{
    try {
        const therapistId = req.params.therapistId;
        if (!therapistId) {
            return next(CreateError(400, "Therapist ID is required"));
        }

        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }

        if(!therapist.isBlocked)
        {
            const token = req.cookies.therapist_access_token;
            if(token){
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const tokenId = decoded.id;
                    if(therapistId===tokenId)
                    {
                        res.cookie("therapist_access_token","",{maxAge:0});
                    }
                } catch (error) {
                    console.log("User is not signed in:", err.message);
                }
            }
        }

        therapist.isBlocked = !therapist.isBlocked;

        await therapist.save();

        return next(CreateSuccess(200, 'Therapist block status toggled successfully', {
            therapistId: therapist._id.toString(),
            isBlocked: therapist.isBlocked
         }));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.userBlockToggle = async (req,res,next)=>{
    try {
        const userId = req.params.userId;
        if (!userId) {
            return next(CreateError(400, "User ID is required"));
        }

        const user = await User.findById(userId);
        if (!user) {
            return next(CreateError(404, "User not found"));
        }

        if(!user.isBlocked)
        {
            const token = req.cookies.user_access_token;
            if(token){
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const tokenId = decoded.id;
                    if(userId===tokenId)
                    {
                        res.cookie("user_access_token","",{maxAge:0});
                    }
                } catch (error) {
                    console.log("User is not signed in:", err.message);
                }
            }
        }

        user.isBlocked = !user.isBlocked;

        await user.save();

        return next(CreateSuccess(200, 'User block status toggled successfully', {
            userId: user._id.toString(),
            isBlocked: user.isBlocked
         }));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.deleteTherapist = async (req,res,next)=>{
    try {
        const therapistId = req.params.therapistId;
        if (!therapistId) {
            return next(CreateError(400, "Therapist ID is required"));
        }

        const therapist = await Therapist.findById(therapistId);
        if (!therapist) {
            return next(CreateError(404, "Therapist not found"));
        }

        if(!therapist.isDeleted)
        {
            const token = req.cookies.therapist_access_token;
            if(token){
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const tokenId = decoded.id;
                    if(therapistId===tokenId)
                    {
                        res.cookie("therapist_access_token","",{maxAge:0});
                    }
                } catch (error) {
                    console.log("User is not signed in:", err.message);
                }
            }
        }

        therapist.isDeleted = true;

        await therapist.save();

        return next(CreateSuccess(200, 'Therapist deleted successfully', {
            therapistId: therapist._id.toString(),
            isDeleted: therapist.isDeleted
         }));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}

module.exports.DeleteUser = async (req,res,next)=>{
    try {
        const userId = req.params.userId;
        if (!userId) {
            return next(CreateError(400, "User ID is required"));
        }

        const user = await User.findById(userId);
        if (!user) {
            return next(CreateError(404, "User not found"));
        }

        if(!user.isDeleted)
        {
            const token = req.cookies.user_access_token;
            if(token){
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const tokenId = decoded.id;
                    if(userId===tokenId)
                    {
                        res.cookie("user_access_token","",{maxAge:0});
                    }
                } catch (error) {
                    console.log("User is not signed in:", err.message);
                }
            }
        }

        user.isDeleted = true;

        await user.save();

        return next(CreateSuccess(200, 'User block status toggled successfully', {
            userId: user._id.toString(),
            isDeleted: user.isDeleted
         }));

    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong!"));
    }
}