const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Check verification status (refresh user data)
router.get('/status/:userId', notificationController.checkVerificationStatus);

// Get user's notifications
router.get('/:userId', notificationController.getNotifications);

// Mark single notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read for a user
router.put('/:userId/read-all', notificationController.markAllAsRead);

module.exports = router;
