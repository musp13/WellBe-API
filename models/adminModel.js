const mongoose = require("mongoose");

const adminSchema = mongoose.Schema({
    userName:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required:true
    },
    isAdmin:{
        type: Boolean,
        default:true
    }
},
{
    timestamps: true
});

//export default mongoose.model('Admin', adminSchema);
const Admin= mongoose.model('Admin',adminSchema);

module.exports = Admin;