const Admin = require('../models/adminModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');

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
        
        res.cookie("admin_access_token", token, {httpOnly: true, maxAge:24*60*60*1000})
           .status(200)
           .json({
                status: 200,
                message: "Login Success",
                data: admin,
                user_token: token
           });

    } catch (error) {
            return next(CreateError(500,error.message));//'Something went wrong!'
    }
}

module.exports.adminLogout = (req,res,next)=>{
    res.cookie("admin_access_token","",{maxAge:0});
    return next(CreateSuccess(200,'User logged out'));
}