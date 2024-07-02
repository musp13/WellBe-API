const mongoose = require("mongoose");

const chatSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderType: {
        type: String,
        enum: ['User', 'Admin'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
},
{
    timestamps: true
});

const Chat= mongoose.model('Chat',chatSchema);

module.exports = Chat;