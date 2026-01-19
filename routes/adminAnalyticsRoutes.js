const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../middleware/adminAuth');
const {
    getPlatformOverview,
    getUserGrowth,
    getEngagementMetrics,
    getActivityLogs
} = require('../controllers/adminAnalyticsController');

// ===== ANALYTICS ROUTES =====
// All routes require admin authentication and viewAnalytics permission

// GET /api/admin/analytics/overview - Platform overview
router.get('/overview', protect, hasPermission('viewAnalytics'), getPlatformOverview);

// GET /api/admin/analytics/growth - User growth data
router.get('/growth', protect, hasPermission('viewAnalytics'), getUserGrowth);

// GET /api/admin/analytics/engagement - Engagement metrics
router.get('/engagement', protect, hasPermission('viewAnalytics'), getEngagementMetrics);

// GET /api/admin/analytics/activity-logs - Admin activity logs
router.get('/activity-logs', protect, hasPermission('viewAnalytics'), getActivityLogs);

module.exports = router;
