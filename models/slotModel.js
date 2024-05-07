const mongoose = require("mongoose");

const slotSchema = mongoose.Schema({
    slotNumber: {
        type: Number,
        required:true
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }   
});

const Slot= mongoose.model('Slot',slotSchema);

module.exports = Slot;