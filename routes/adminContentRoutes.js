const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../middleware/adminAuth');
const {
    getAllPosts,
    getPostById,
    removePost,
    getAllReports,
    getReportById,
    resolveReport,
    takeReportAction,
    getContentStats
} = require('../controllers/adminContentController');

// ===== CONTENT MODERATION ROUTES =====
// All routes require admin authentication and manageContent permission

// ===== POST ROUTES =====
// GET /api/admin/content/stats - Get content statistics
router.get('/stats', protect, hasPermission('manageContent'), getContentStats);

// GET /api/admin/content/posts - Get all posts
router.get('/posts', protect, hasPermission('manageContent'), getAllPosts);

// GET /api/admin/content/posts/:id - Get single post
router.get('/posts/:id', protect, hasPermission('manageContent'), getPostById);

// DELETE /api/admin/content/posts/:id - Remove post
router.delete('/posts/:id', protect, hasPermission('manageContent'), removePost);

// ===== REPORT ROUTES =====
// GET /api/admin/content/reports - Get all reports
router.get('/reports', protect, hasPermission('manageContent'), getAllReports);

// GET /api/admin/content/reports/:id - Get single report
router.get('/reports/:id', protect, hasPermission('manageContent'), getReportById);

// PUT /api/admin/content/reports/:id/resolve - Resolve report
router.put('/reports/:id/resolve', protect, hasPermission('manageContent'), resolveReport);

// POST /api/admin/content/reports/:id/action - Take action on report
router.post('/reports/:id/action', protect, hasPermission('manageContent'), takeReportAction);

module.exports = router;
