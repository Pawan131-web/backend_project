const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'verification_approved', 
            'verification_rejected', 
            'new_internship', 
            'application', 
            'general',
            'account_blocked',
            'account_unblocked',
            'appeal_response',
            'appeal_submitted',
            'announcement',
            'internship_application',
            'admin_action',
            'application_received',
            'application_shortlisted',
            'application_accepted',
            'application_rejected',
            'application_withdrawn'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
