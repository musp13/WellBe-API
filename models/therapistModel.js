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
        //unique: true
    },
    specilizations: [{
        type: String
    }],
    experiences: [{
        title: {
            type: String,
            required: true
        },
        company: {
            type: String,
            required: true
        },
        location: {
            type: String
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date
        },
        current: {
            type: Boolean,
            default: false
        },
        description: {
            type: String
        }
    }],
    languagesSpoken: [{
        type: String
    }],
    consultationFee: {
        type: Number// hourly rate
    },
    ratesPerExtraPerson: {
        type: Number // percentage extra
    },
    availability: [{
        day: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        slotNumbers: [{
            type: Number,
            required: true
        }],
        shift : {
            type: String,
            enum: ["morning", "afternoon", "fullDay"]
        },
        startTime: String,
        endTime: String,
        isUnavailable: {
            type: Boolean,
            default: false // Indicates whether the therapist is unavailable for appointments during this slot
        },
        reasonForUnavailable: {
            type: String // Optional field to specify the reason for unavailability (e.g., holiday, personal time off)
        }
    }],
    leave: [{
        leaveDate: {
            type: Date,
            required: true
        },
        shift: {
            type: String,
            enum: ["morning", "afternoon", "fullDay"]
        },
        startTime: String,
        endTime: String,
        reason: String
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
    },
    OTP: {
        type: String,
        default: null
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
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