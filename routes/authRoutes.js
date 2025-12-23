const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

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

module.exports = router;