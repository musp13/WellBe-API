const mongoose = require("mongoose");

const therapistSchema = mongoose.Schema({
    fullName:{
        type: String,
    },
    userName:{
        type: String,
        unique: true,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
    },
    profileImage:{
        type: String,
        default: "avatar.png"        
    },
    phoneNo:{
        type: String
    },
    age:{
        age: Number
    },
    gender:{
        type: String,
        enum : ["male", "female", "other"]
    },
    location:{
        type: String,
    },
    bio: {
        type: String
    },
    qualifications:[{
        degree: String,
        institution: String,
        yearOfPassing: Number
    }],
    licenseNumber:{
        type: String,
        unique: true
    },
    specilizations: [{
        type: String
    }],
    yearsOfExperience:{
        type:Number
    },
    languagesSpoken: [{
        type: String
    }],
    consultationFee: {
        type: Number// hourly rate
    },
    availability: [{
        day: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        startTime: String,
        endTime: String
    }],
    reviews: [{
        userId: mongoose.Schema.Types.ObjectId,
        userName : String,
        rating: Number,
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    isApproved: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

//export default mongoose.model('Therapist', therapistSchema);
const Therapist= mongoose.model('Therapist',therapistSchema);

module.exports = Therapist;