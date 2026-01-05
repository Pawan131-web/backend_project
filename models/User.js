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
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
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