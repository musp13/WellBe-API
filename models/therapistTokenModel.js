const mongoose = require("mongoose");

const therapistTokenSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Therapist"
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 3000
    }
    
});

const TherapistToken= mongoose.model('TherapistToken',therapistTokenSchema);

module.exports = TherapistToken;