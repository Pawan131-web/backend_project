// routes/profileViewRoutes.js
const express = require('express');
const router = express.Router();
const profileViewController = require('../controllers/profileViewController');

// Track profile view
router.post('/:profileUserId/view', profileViewController.trackProfileView);

// Get profile views
router.get('/:userId/views', profileViewController.getProfileViews);

module.exports = router;
