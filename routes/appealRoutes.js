// routes/appealRoutes.js
const express = require('express');
const router = express.Router();
const appealController = require('../controllers/appealController');

// Create appeal (user)
router.post('/', appealController.createAppeal);

// Get user's appeals
router.get('/user/:userId', appealController.getUserAppeals);

// Get all appeals (admin)
router.get('/', appealController.getAllAppeals);

// Respond to appeal (admin)
router.put('/:id/respond', appealController.respondToAppeal);

module.exports = router;
