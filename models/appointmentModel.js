const mongoose = require('mongoose');

const apointmentSchema = mongoose.Schema({
    therapistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Therapist',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientContactNumber: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        //required: true
    },
    slotNumber : {
        type : Number,
        required : true
    },
    duration: {
        type: Number,
        default: 60 // in minutes
    },
    message: {
        type: String
    },
    status: {
        type: String,
        enum: ['scheduled', 'cancelled', 'completed'],
        default: 'scheduled'
    },
    notes: {
        type: String
    },
    participants: {
        type: Number,
        default: 1
    },
    appointmentNumber:{
        type: Number,
        required: true,
        unique: true
    }
},
{
    timestamps: true
});

const Appointment = mongoose.model("Appointment", apointmentSchema);

module.exports = Appointment;