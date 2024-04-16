const mongoose = require("mongoose");

const journalSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    morningAffirmations: {
        todaysFocus: { type: String },
        excitedAbout: { type: String },
        affirmation: { type: String },
        todaysGoal: { type: String }
    },
    eveningReflections: {
        goodThings: { type: [String] },
        positiveActions: { type: [String] },
        gratefulFor: { type: [String] },
        peopleMadeFeelGood: { type: [String] }
    }
},
{
    timestamps: true
});

const Journal= mongoose.model('Journal',journalSchema);

module.exports = Journal;