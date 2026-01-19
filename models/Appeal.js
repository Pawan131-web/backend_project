// models/Appeal.js
const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['block_appeal', 'report', 'feedback'],
        default: 'block_appeal'
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'approved', 'rejected'],
        default: 'pending'
    },
    adminResponse: {
        type: String,
        trim: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Appeal = mongoose.model('Appeal', appealSchema);

module.exports = Appeal;
