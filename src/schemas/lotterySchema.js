const mongoose = require('mongoose');

const lotterySchema = new mongoose.Schema({
    Guild: { type: String, required: true },
    Active: { type: Boolean, default: true },
    Frozen: { type: Boolean, default: false },
    EntryFee: { type: Number, required: true },
    PrizePool: { type: Number, default: 0 },
    BasePrizePool: { type: Number, default: 0 },
    MaxWinners: { type: Number, default: 1 },
    Frequency: { 
        type: String, 
        enum: ['hourly', 'daily', 'weekly'], 
        default: 'weekly'
    },
    NextDrawTime: { type: Date, required: true },
    AnnouncementChannelId: { type: String, required: true },
    LastDrawId: { type: String, default: null },
    CreatedBy: { type: String, required: true },
    CreatedAt: { type: Date, default: Date.now },
    LastModifiedBy: { type: String, required: true },
    LastModifiedAt: { type: Date, default: Date.now },
    Entries: [{
        UserId: { type: String, required: true },
        UserTag: { type: String, required: true },
        Tickets: { type: Number, default: 1 },
        EnteredAt: { type: Date, default: Date.now }
    }],
    History: [{
        DrawTime: { type: Date, required: true },
        TotalPrizePool: { type: Number, required: true },
        TotalTickets: { type: Number, required: true },
        Winners: [{
            UserId: { type: String, required: true },
            UserTag: { type: String, required: true },
            PrizeAmount: { type: Number, required: true }
        }]
    }]
});

module.exports = mongoose.model('Lottery', lotterySchema);
