const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    // Announcement content
    title: {
        type: String,
        required: [true, 'Announcement title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    
    message: {
        type: String,
        required: [true, 'Announcement message is required'],
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    
    // Announcement type
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error', 'maintenance'],
        default: 'info'
    },
    
    // Target audience
    target: {
        type: String,
        enum: ['all', 'students', 'organizations', 'verified_users', 'unverified_users'],
        default: 'all'
    },
    
    // Priority level
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sent', 'archived'],
        default: 'draft'
    },
    
    // Sending details
    isSent: {
        type: Boolean,
        default: false
    },
    
    sentAt: {
        type: Date
    },
    
    scheduledFor: {
        type: Date
    },
    
    // Recipients count
    recipientsCount: {
        type: Number,
        default: 0
    },
    
    // Admin who created
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: [true, 'Creator ID is required']
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
announcementSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Create indexes for better query performance
announcementSchema.index({ createdBy: 1, createdAt: -1 });
announcementSchema.index({ status: 1, createdAt: -1 });
announcementSchema.index({ target: 1, status: 1 });
announcementSchema.index({ scheduledFor: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
