// controllers/adminAuthController.js
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔍 Admin login attempt for:', email);
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        // Find admin with password
        const admin = await Admin.findOne({ email }).select('+password');
        
        if (!admin) {
            console.log('❌ Admin not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check if admin is active
        if (!admin.isActive) {
            console.log('❌ Admin inactive:', email);
            return res.status(401).json({
                success: false,
                message: 'Admin account is deactivated'
            });
        }
        
        // Verify password
        console.log('🔍 Comparing password for admin:', email);
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        
        if (!isPasswordValid) {
            console.log('❌ Password invalid for admin:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: admin._id, 
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            },
            process.env.JWT_SECRET || 'admin_secret_key',
            { expiresIn: '8h' }
        );
        
        // Remove password from response
        admin.password = undefined;
        
        console.log('✅ Admin login successful:', email);
        
        res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin
            }
        });
        
    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

// Admin Logout (client-side token removal)
exports.logout = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Admin logged out successfully'
    });
};

// Get current admin profile
exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Get admin profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};