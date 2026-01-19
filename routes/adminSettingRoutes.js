const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/adminAuth');
const {
    getAllSettings,
    getSettingByKey,
    updateSettings,
    updateSingleSetting,
    initializeDefaultSettings,
    getSystemHealth
} = require('../controllers/adminSettingController');

// ===== SETTINGS ROUTES =====
// Most routes require super_admin role

// GET /api/admin/system/health - Get system health status (all admins can access)
router.get('/system/health', protect, getSystemHealth);

// POST /api/admin/settings/initialize - Initialize default settings (super_admin only)
router.post('/initialize', protect, authorize('super_admin'), initializeDefaultSettings);

// GET /api/admin/settings - Get all settings (super_admin only)
router.get('/', protect, authorize('super_admin'), getAllSettings);

// PUT /api/admin/settings - Update multiple settings (super_admin only)
router.put('/', protect, authorize('super_admin'), updateSettings);

// GET /api/admin/settings/:key - Get single setting (super_admin only)
router.get('/:key', protect, authorize('super_admin'), getSettingByKey);

// PUT /api/admin/settings/:key - Update single setting (super_admin only)
router.put('/:key', protect, authorize('super_admin'), updateSingleSetting);

module.exports = router;
