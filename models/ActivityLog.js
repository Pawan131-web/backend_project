const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Admin who performed the action
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: [true, 'Admin ID is required']
    },
    
    // Action performed
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: [
            'user_blocked',
            'user_unblocked',
            'user_deleted',
            'user_verified',
            'org_verified',
            'org_rejected',
            'post_removed',
            'report_resolved',
            'announcement_sent',
            'skill_added',
            'skill_updated',
            'skill_deleted',
            'settings_updated',
            'admin_created',
            'admin_updated',
            'admin_deleted',
            'login',
            'logout',
            'other'
        ]
    },
    
    // Target of the action
    targetType: {
        type: String,
        enum: ['user', 'organization', 'post', 'report', 'announcement', 'skill', 'setting', 'admin', 'system'],
        required: [true, 'Target type is required']
    },
    
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    
    // Additional details
    details: {
        type: String,
        maxlength: [500, 'Details cannot exceed 500 characters']
    },
    
    // Metadata
    ipAddress: {
        type: String
    },
    
    userAgent: {
        type: String
    },
    
    // Status
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for better query performance
activityLogSchema.index({ adminId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });
activityLogSchema.index({ timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
