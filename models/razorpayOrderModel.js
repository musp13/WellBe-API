const mongoose = require("mongoose");

const razorpayOrderSchema = mongoose.Schema({
    id: {
         type: String, required: true 
        },
    entity: { 
        type: String, required: true 
    },
    amount: { 
        type: Number, required: true 
    },
    amount_paid: { 
        type: Number, required: true 
    },
    amount_due: { 
        type: Number, required: true 
    },
    currency: { 
        type: String, required: true 
    },
    receipt: { 
        type: String, required: true 
    },
    offer_id: { 
        type: String, default: null 
    },
    status: { 
        type: String, required: true 
    },
    attempts: { 
        type: Number, required: true 
    },
    notes: { 
        type: Array, default: [] 
    },
    created_at: { 
        type: Number, required: true 
    }   
});

//export default mongoose.model('Admin', adminSchema);
const RazorpayOrder= mongoose.model('RazorpayOrder',razorpayOrderSchema);

module.exports = RazorpayOrder;