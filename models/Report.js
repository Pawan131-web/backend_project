const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    // Reporter information
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter ID is required']
    },
    
    // What is being reported
    reportedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Reported item ID is required']
    },
    
    reportedType: {
        type: String,
        enum: ['user', 'post', 'comment'],
        required: [true, 'Reported type is required']
    },
    
    // Report details
    reason: {
        type: String,
        enum: [
            'spam',
            'harassment',
            'inappropriate_content',
            'fake_profile',
            'scam',
            'violence',
            'hate_speech',
            'other'
        ],
        required: [true, 'Report reason is required']
    },
    
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    
    // Report status
    status: {
        type: String,
        enum: ['pending', 'under_review', 'resolved', 'dismissed'],
        default: 'pending'
    },
    
    // Action taken
    actionTaken: {
        type: String,
        enum: ['none', 'warning', 'content_removed', 'user_blocked', 'account_suspended'],
        default: 'none'
    },
    
    actionNote: {
        type: String,
        maxlength: [500, 'Action note cannot exceed 500 characters']
    },
    
    // Admin who handled the report
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    
    resolvedAt: {
        type: Date
    },
    
    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
reportSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create indexes for better query performance
reportSchema.index({ reporterId: 1, createdAt: -1 });
reportSchema.index({ reportedId: 1, reportedType: 1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ resolvedBy: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
