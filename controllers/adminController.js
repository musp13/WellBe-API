const Admin = require('../models/adminModel.js');
const Therapist = require('../models/therapistModel.js');
const User = require('../models/userModel.js');
const Slot = require('../models/slotModel.js');

const { CreateError } = require('../utils/error');
const {CreateSuccess} = require('../utils/success');
const { sendVerifyMail } = require('../utils/sendVerifyMail.js');
const { sendEmail } = require('../utils/sendEmail.js')

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const generator = require('generate-password');

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
            return next(CreateError(402, "Passwords do not match"));
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
        //let OTP;
        const therapist = await Therapist.findOne({$or:[{email: req.body.email}, {userName: req.body.userName}]});
        if(therapist)
        {
            return next(CreateError(400, "Email or username already registered"));
        }
        if(req.body.fullName.trim().length<3)
        {
            return next(CreateError(403, "Full Name should have atleast 3 characters"));
        }
        /* if(req.body.password != req.body.confirmPassword)
        {
            return next(CreateError(401, "Passwords do not match"));
        }
        if(req.body.password.trim().length<8)
        {
            return next(CreateError(401, "Password should be atleast 8 characters"));
        } */
        const password = generator.generate({
            length: 8,
            numbers: true
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newTherapist = new Therapist({
            fullName:req.body.fullName,
            email: req.body.email,
            userName: req.body.userName,
            password: hashedPassword
        });

        await newTherapist.save();

        if(newTherapist)
        {
            
            //OTP = await sendVerifyMail(req.body.fullName,req.body.email,newTherapist._id);
            const subject = `Verify Your Email to Get Started`;
            message = `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .header { color: #333366; font-size: 24px; }
                    .important { color: #FF0000; }
                    .info { margin-top: 20px; font-size: 18px; }
                    .footer { margin-top: 40px; font-size: 16px; color: #777; }
                    a { color: #1A0DAB; }
                </style>
            </head>
            <body>
                <p class="header">Welcome to WellBe!</p>
            
                <p>Hi ${newTherapist.fullName},</p>
            
                <p>Thank you for registering with WellBe! You’re just one step away from accessing all the great features we offer. Please verify your email address to activate your account.</p>
                
                <p><strong>Username:</strong> ${newTherapist.userName}</p>
                <p><strong>Temporary Password:</strong> ${password}</p>
            
                <p>Please follow the link below to verify your email address and complete your registration:</p>
                <p><a href="${process.env.BASE_URL_CLIENT}/therapist/otp_verification?userId=${newTherapist._id}&userType=therapist">Verify Your Email</a></p>
            
                <p class="info">For your security, please ensure you change your temporary password after logging in for the first time. If you did not initiate this request, please ignore this email or contact our support team.</p>
            
                <p>If you have any questions or need help, feel free to reach out to our support team at <a href="mailto:[Support Email]">WellBe@gmail.com</a>.</p>
            
                <p class="footer">Welcome aboard and thank you for choosing WellBe!</p>
                
                <p class="footer">Best regards,</p>
                <p class="footer">Mxxxxxxxxxx<br>Head of Operations<br>WellBe<br>+91 989XXXXXXX</p>
            </body>
            </html>
            `;

            //[''],{ queryParams: {  }
            sendEmail(newTherapist.email,message,subject);
            //await Therapist.findByIdAndUpdate({_id:newTherapist._id},{$set:{OTP: OTP}});
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

         if(therapist.isApproved)
         {
            subject = `You're In! Welcome to WellBe Family`;
            message = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to WellBe!</title>
                <style>
                    /* Add your custom styles here */
                    body {
                        font-family: Arial, sans-serif;
                        color: #26ABA3;
                        background-color: #f7f7f7;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 20px auto;
                        padding: 20px;
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #26ABA3;
                    }
                    p {
                        margin-bottom: 20px;
                    }
                    .btn {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: #fff;
                        text-decoration: none;
                        border-radius: 5px;
                    }
                    .btn:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Welcome to WellBe!</h1>
                    <p>Dear ${therapist.fullName},</p>
                    <p>We are thrilled to welcome you to the WellBe community! On behalf of our team, I would like to extend a warm welcome and express our gratitude for choosing to join us as a valued therapist.</p>
                    <p>Your approval by our administrative team signifies not only your professional competence but also your alignment with our values and commitment to providing exceptional care to our clients. We are confident that your expertise will greatly contribute to our mission of providing better mental health to our clients.</p>
                    <p>As you embark on this journey with us, we want to ensure that you have all the necessary resources and support to thrive in your role.</p>
                    <ol>
                        <li><strong>Access to Resources:</strong> You now have access to our therapist portal, where you can find important documents, resources, and updates. Please log in using the credentials provided to you.</li>
                        <li><strong>Orientation Session:</strong> We invite you to attend our upcoming orientation session for new therapists, where you will learn more about our organization, policies, and procedures. Details regarding the session will be sent to you shortly.</li>
                        <li><strong>Support Team:</strong> Our dedicated support team is here to assist you with any questions or concerns you may have. Feel free to reach out to WellBe admin team for assistance.</li>
                        <li><strong>Feedback and Collaboration:</strong> We value open communication and collaboration. Your feedback is essential to us, and we encourage you to share your thoughts, ideas, and suggestions as we work together to deliver the best possible care to our clients.</li>
                    </ol>
                    <p>Once again, welcome to the team! We are excited to have you on board and look forward to the positive impact you will make within our community.</p>
                    <p>Best regards,<br>
                    Mxxxxxxxxx<br>
                    Head of Operations<br>
                    WellBe</p>
                </div>
            </body>
            </html>
            `
            sendEmail(therapist.email, message, subject);
         }

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

module.exports.populateSlots = async (req,res,next) =>{
    console.log('hello');
    const timeSlots = [
        { slotNumber: 1, startTime: "09:00 AM", endTime: "10:00 AM" },
        { slotNumber: 2, startTime: "10:00 AM", endTime: "11:00 AM" },
        { slotNumber: 3, startTime: "11:00 AM", endTime: "12:00 PM" },
        { slotNumber: 4, startTime: "12:00 PM", endTime: "01:00  PM" },
        { slotNumber: 5, startTime: "02:00 PM", endTime: "03:00 PM" },
        { slotNumber: 6, startTime: "03:00 PM", endTime: "04:00 PM" },
        { slotNumber: 7, startTime: "04:00 PM", endTime: "05:00 PM" },
        { slotNumber: 8, startTime: "05:00 PM", endTime: "06:00 PM" },
    ];

    Slot.insertMany(timeSlots)
        .then(() => console.log('Time slots added successfully!'))
        .catch(err => console.error('Error adding time slots:', err));
}