const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    // User who created the post
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    
    // Post details
    title: {
        type: String,
        required: [true, 'Post title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    
    content: {
        type: String,
        required: [true, 'Post content is required'],
        maxlength: [5000, 'Content cannot exceed 5000 characters']
    },
    
    // Post type: internship posting or general update
    type: {
        type: String,
        enum: ['internship', 'update', 'announcement', 'news', 'project'],
        default: 'update'
    },
    
    // Image/media attachments
    images: [{
        url: String,
        caption: String
    }],
    
    // Single media attachment (base64 or URL)
    media: {
        type: String,
        default: ''
    },
    mediaType: {
        type: String,
        enum: ['image', 'video', 'document', ''],
        default: ''
    },
    
    // Structured skills for recommendations/search (especially for internships)
    skills: [{
        type: String,
        trim: true
    }],
    
    // Skills with proficiency levels for matching algorithm
    skillsWithLevels: [{
        name: { type: String, trim: true },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' }
    }],
    
    // Optional internship-specific fields
    internshipLocation: {
        type: String,
        trim: true
    },
    internshipType: {
        type: String,
        trim: true
    },
    internshipMode: {
        type: String,
        trim: true
    },
    internshipDuration: {
        type: String,
        trim: true
    },
    internshipStipend: {
        type: String,
        trim: true
    },
    internshipOpenings: {
        type: Number
    },
    internshipDeadline: {
        type: Date
    },
    internshipRequirements: {
        type: String,
        trim: true
    },
    
    // Post status
    status: {
        type: String,
        enum: ['active', 'removed', 'flagged'],
        default: 'active'
    },
    
    // Moderation
    isReported: {
        type: Boolean,
        default: false
    },
    
    reportCount: {
        type: Number,
        default: 0
    },
    
    removedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    
    removalReason: {
        type: String
    },
    
    removedAt: {
        type: Date
    },
    
    // Engagement metrics
    views: {
        type: Number,
        default: 0
    },
    
    likes: {
        type: Number,
        default: 0
    },
    
    // Track users who liked this post for toggle functionality
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Track users who saved this post
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Comments array to store actual comments
    commentsList: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, trim: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now }
    }],
    
    comments: {
        type: Number,
        default: 0
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
postSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Create indexes for better query performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ type: 1, status: 1 });
postSchema.index({ isReported: 1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
