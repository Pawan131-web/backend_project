const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Admin name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'moderator'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    permissions: {
        manageUsers: { type: Boolean, default: true },
        manageOrgs: { type: Boolean, default: true },
        manageContent: { type: Boolean, default: true },
        manageSkills: { type: Boolean, default: true },
        sendAnnouncements: { type: Boolean, default: true },
        viewAnalytics: { type: Boolean, default: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Password comparison method
adminSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        return false;
    }
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;