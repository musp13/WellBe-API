const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    fullName:{
        type: String,
        required: true
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
    interests: [{
        type: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

//export default mongoose.model('User', userSchema);
const User= mongoose.model('User',userSchema);

module.exports = User;