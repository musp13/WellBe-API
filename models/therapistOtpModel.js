const mongoose = require("mongoose");

const therapistOtpSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Therapist"
    },
    OTP: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 5000
    }
    
});

const TherapistOtp= mongoose.model('TherapistOtp',therapistOtpSchema);

module.exports = TherapistOtp;