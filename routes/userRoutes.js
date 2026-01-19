// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// @route   GET /api/users/search
// @desc    Search users by username or name
// @access  Public (or Private if you want)
router.get('/search', userController.searchUsers);

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get('/profile/:username', userController.getUserProfile);

// @route   GET /api/users/me/:userId
// @desc    Get own full profile for editing
// @access  Private
router.get('/me/:userId', userController.getMyProfile);

// @route   PUT /api/users/profile-picture
// @desc    Update user profile picture and cover photo
// @access  Private
router.put('/profile-picture', userController.updateProfilePicture);

// @route   PUT /api/users/profile/:userId
// @desc    Update full user profile
// @access  Private
router.put('/profile/:userId', userController.updateProfile);

// @route   GET /api/users/test
// @desc    Test user routes
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'User routes are working',
        endpoints: {
            search: 'GET /search?query=searchterm',
            profile: 'GET /profile/:username'
        }
    });
});

module.exports = router;