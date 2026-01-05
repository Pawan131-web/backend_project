const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { protect } = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminAuthController.login);
router.post('/logout', adminAuthController.logout);

// Protected routes
router.get('/profile', protect, adminAuthController.getProfile);

module.exports = router;