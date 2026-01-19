// routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

// Protected routes (require authentication)
router.post('/save', protect, portfolioController.savePortfolio);
router.get('/my', protect, portfolioController.getMyPortfolio);
router.get('/check', protect, portfolioController.checkPortfolio);
router.post('/publish', protect, portfolioController.publishPortfolio);
router.patch('/visibility', protect, portfolioController.toggleVisibility);
router.delete('/delete', protect, portfolioController.deletePortfolio);
router.get('/share-link', protect, portfolioController.getShareLink);

// Public routes (no authentication required)
router.get('/public/:shareToken', portfolioController.getPublicPortfolio);

// Organization routes (require authentication)
router.get('/student/:studentId', protect, portfolioController.getPortfolioByStudentId);

module.exports = router;