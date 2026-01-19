// models/Portfolio.js
const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    // Student who owns this portfolio
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
        unique: true // Each student can have only one active portfolio
    },
    
    // Basic Information
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    professionalTitle: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    university: {
        type: String,
        trim: true,
        default: ''
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    
    // Profile Photo (base64 or URL)
    profilePhoto: {
        type: String,
        default: ''
    },
    
    // Cover Photo (base64 or URL)
    coverPhoto: {
        type: String,
        default: ''
    },
    
    // Education
    education: [{
        institution: { type: String, trim: true },
        degree: { type: String, trim: true },
        field: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        currentlyStudying: { type: Boolean, default: false },
        description: { type: String, trim: true }
    }],
    
    // Skills
    skills: {
        technical: [{
            name: { type: String, trim: true },
            level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' }
        }],
        soft: { type: String, trim: true, default: '' },
        languages: [{
            language: { type: String, trim: true },
            proficiency: { type: String, trim: true }
        }]
    },
    
    // Experience
    experience: [{
        title: { type: String, trim: true },
        company: { type: String, trim: true },
        location: { type: String, trim: true },
        type: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true }
    }],
    
    // Projects
    projects: [{
        title: { type: String, trim: true },
        technologies: { type: String, trim: true },
        url: { type: String, trim: true },
        demoUrl: { type: String, trim: true },
        description: { type: String, trim: true }
    }],
    
    // Certifications
    certifications: [{
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        date: { type: String, trim: true },
        credentialId: { type: String, trim: true },
        url: { type: String, trim: true }
    }],
    
    // Additional Information
    additionalInfo: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Social Links
    socialLinks: {
        linkedin: { type: String, trim: true, default: '' },
        github: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' },
        website: { type: String, trim: true, default: '' }
    },
    
    // Generated HTML Preview (the actual portfolio preview)
    previewHTML: {
        type: String,
        default: ''
    },
    
    // Public sharing
    isPublic: {
        type: Boolean,
        default: false
    },
    shareToken: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Portfolio status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    publishedAt: {
        type: Date
    }
});

// Update the updatedAt timestamp before saving
portfolioSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Generate share token before saving if publishing
portfolioSchema.pre('save', function() {
    if (this.isPublic && !this.shareToken) {
        this.shareToken = this._id.toString() + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
});

// Create indexes
portfolioSchema.index({ studentId: 1 });
portfolioSchema.index({ shareToken: 1 });
portfolioSchema.index({ status: 1 });

const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;