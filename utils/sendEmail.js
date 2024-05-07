const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

module.exports.sendEmail = async (email,message, subject)=>{
    try
    {
        //let message = `<p>Welcome ${name}. Please enter this OTP to verify your Email. `;
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
            subject:subject,
            html: message
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
