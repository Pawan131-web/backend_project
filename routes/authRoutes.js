// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/User');
// @route   POST /api/auth/register
// @desc    Register a new user (student or organization)
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/auth/verify
// @desc    Verify email with code
// @access  Public
router.post('/verify', authController.verifyEmail);

router.post('/org/verification', authController.submitOrgVerification);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private (will implement later)
router.get('/profile', authController.getProfile);

// @route   GET /api/auth/test
// @desc    Test auth routes
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes are working',
        endpoints: {
            register: 'POST /register',
            login: 'POST /login',
            verify: 'POST /verify',
            profile: 'GET /profile'
        }
    });
});
// @route   GET /api/auth/check-username
// @desc    Check if username is available
// @access  Public
router.get('/check-username', async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username parameter is required'
            });
        }
        
        // Check if username exists (case insensitive)
        const existingUser = await User.findOne({ 
            username: username.toLowerCase() 
        });
        
        res.json({
            success: true,
            available: !existingUser,
            username: username
        });
        
    } catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
// @route   GET /api/auth/check-username
// @desc    Check if username is available
// @access  Public
router.get('/check-username', async (req, res) => {
    try {
        const { username } = req.query;
        
        console.log('🔍 Checking username availability:', username);
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username parameter is required'
            });
        }
        
        // Clean and lowercase the username
        const cleanUsername = username.trim().toLowerCase();
        
        // Check if username exists (case insensitive)
        const existingUser = await User.findOne({ 
            username: cleanUsername 
        });
        
        console.log('🔍 Username search result:', existingUser ? 'Taken' : 'Available');
        
        res.json({
            success: true,
            available: !existingUser,
            username: cleanUsername,
            message: existingUser ? 'Username already taken' : 'Username available'
        });
        
    } catch (error) {
        console.error('❌ Username check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking username',
            error: error.message
        });
    }
});
module.exports = router;