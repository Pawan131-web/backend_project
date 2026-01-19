// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    fullName: {
        type: String,
        required: [true, 'Please enter your full name'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
     username: {
        type: String,
        required: [true, 'Please enter a username'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    
    // User Type: 'student' or 'organization'
    userType: {
        type: String,
        required: [true, 'Please select user type'],
        enum: ['student', 'organization'],
        default: 'student'
    },
    
    // Profile Picture (base64 or URL)
    profilePicture: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Cover/Banner Photo (base64 or URL)
    coverPhoto: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Profile Information
    title: {
        type: String,
        trim: true,
        default: ''
    },
    bio: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    website: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Skills (array of skill objects)
    skills: [{
        name: { type: String, trim: true },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' }
    }],
    
    // Education history
    education: [{
        institution: { type: String, trim: true },
        degree: { type: String, trim: true },
        field: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true }
    }],
    
    // Work Experience
    experience: [{
        company: { type: String, trim: true },
        role: { type: String, trim: true },
        location: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true }
    }],
    
    // Projects
    projects: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        technologies: { type: String, trim: true },
        link: { type: String, trim: true },
        image: { type: String, trim: true }
    }],
    
    // Certifications
    certifications: [{
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        date: { type: String, trim: true },
        credentialId: { type: String, trim: true },
        link: { type: String, trim: true }
    }],
    
    // Social Links
    socialLinks: {
        linkedin: { type: String, trim: true, default: '' },
        github: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' },
        portfolio: { type: String, trim: true, default: '' }
    },
    
    // Organization Type (industry sector for context-aware recommendations)
    orgType: {
        type: String,
        enum: ['it', 'technology', 'finance', 'banking', 'healthcare', 'marketing', 'consulting', 'education', 'manufacturing', 'retail', 'media', 'other'],
        default: 'other'
    },
    
    // Organization Verification (only applicable for organization accounts)
    orgVerificationStatus: {
        type: String,
        enum: ['not_required', 'unsubmitted', 'pending', 'verified', 'rejected'],
        default: function() {
            return this.userType === 'organization' ? 'unsubmitted' : 'not_required';
        }
    },
    orgRegistrationNumber: {
        type: String,
        trim: true
    },
    orgVerificationDocuments: [{
        documentType: {
            type: String,
            trim: true
        },
        documentUrl: {
            type: String,
            trim: true
        },
        note: {
            type: String,
            trim: true
        },
        files: [{
            name: {
                type: String,
                trim: true
            },
            type: {
                type: String,
                trim: true
            },
            size: {
                type: Number
            },
            url: {
                type: String,
                trim: true
            }
        }],
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    orgVerificationSubmittedAt: {
        type: Date
    },
    orgVerifiedAt: {
        type: Date
    },
    orgRejectionReason: {
        type: String,
        trim: true
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Block Status
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: {
        type: String,
        trim: true
    },
    blockedAt: {
        type: Date
    },
    blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Email Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    
    verificationCode: {
        type: String,
        select: false
    },
    
    codeExpires: {
        type: Date,
        select: false
    },
    
    verificationAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ===== PASSWORD HASHING MIDDLEWARE =====
userSchema.pre('save', async function() {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return;
    
    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw error;
    }
});

// ===== PASSWORD COMPARISON METHOD =====
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

// ===== CREATE MODEL =====
const User = mongoose.model('User', userSchema);

// Export
module.exports = User;