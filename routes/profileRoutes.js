// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Get user profile
router.get('/:userId', profileController.getProfile);

// Update user profile
router.put('/:userId', profileController.updateProfile);

// Update profile picture
router.put('/:userId/picture', profileController.updateProfilePicture);

// Update cover image
router.put('/:userId/cover', profileController.updateCoverImage);

module.exports = router;
