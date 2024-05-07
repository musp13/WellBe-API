const Therapist = require('../models/therapistModel');
const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');

const { CreateSuccess } = require('../utils/success');
const { CreateError } = require('../utils/error');

module.exports.getAppointmentDetails = async (req,res,next)=>{
    try {
        const appointmentId = req.params.appointmentId;
        const appointment = await Appointment.findById(appointmentId)
                                .populate('therapistId', 'fullName')
                                .populate('clientId', 'fullName')
                                .exec();

    const appointmentDetails = {
            appointmentId: appointment._id, 
            clientName: appointment.clientId.fullName,
            therapistName : appointment.therapistId.fullName ,
            clientContactNumber: appointment.clientContactNumber,
            slotNumber: appointment.slotNumber ,
            status: appointment.status,
            participants: appointment.participants,
            appointmentNumber: appointment.appointmentNumber,
            date: appointment.date,
            message: appointment.message,
            duration: appointment.duration,
            notes: appointment.notes
        };          
    console.log(appointmentDetails);
    return next(CreateSuccess(200, "Appointment list fetched successfully.", appointmentDetails))

        
    } catch (error) {
        console.log(error.message);
        return next(CreateError(500, "Something went wrong while fetching appointment details."));
    }
}