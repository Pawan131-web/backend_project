// models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    // Student who applied
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    
    // Internship post being applied to
    internshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: [true, 'Internship ID is required']
    },
    
    // Organization that posted the internship
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Organization ID is required']
    },
    
    // Application message/cover letter
    message: {
        type: String,
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters'],
        default: ''
    },
    
    // Resume submission type
    resumeType: {
        type: String,
        enum: ['uploaded', 'portfolio'],
        required: [true, 'Resume type is required']
    },
    
    // Uploaded resume file path (if resumeType is 'uploaded')
    uploadedResume: {
        filename: { type: String, default: '' },
        originalName: { type: String, default: '' },
        path: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 }
    },
    
    // Portfolio reference (if resumeType is 'portfolio')
    portfolioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Portfolio'
    },
    
    // Snapshot of portfolio at time of application (for historical reference)
    portfolioSnapshot: {
        fullName: String,
        professionalTitle: String,
        email: String,
        phone: String,
        summary: String,
        skills: mongoose.Schema.Types.Mixed,
        education: [mongoose.Schema.Types.Mixed],
        experience: [mongoose.Schema.Types.Mixed],
        projects: [mongoose.Schema.Types.Mixed],
        certifications: [mongoose.Schema.Types.Mixed],
        previewHTML: String
    },
    
    // Application status
    status: {
        type: String,
        enum: ['pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    
    // Status history for tracking
    statusHistory: [{
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' }
    }],
    
    // Organization's notes (private)
    organizationNotes: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Match score (if calculated)
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    
    // Timestamps
    appliedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate applications
applicationSchema.index({ studentId: 1, internshipId: 1 }, { unique: true });

// Other indexes for queries
applicationSchema.index({ studentId: 1, status: 1 });
applicationSchema.index({ internshipId: 1, status: 1 });
applicationSchema.index({ organizationId: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });

// Update timestamp before saving
applicationSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Add initial status to history on creation
applicationSchema.pre('save', function() {
    if (this.isNew) {
        this.statusHistory.push({
            status: 'pending',
            changedAt: new Date(),
            note: 'Application submitted'
        });
    }
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
