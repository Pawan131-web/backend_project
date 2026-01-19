const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/adminAuth');
const {
    getAllAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    updateAdminPermissions,
    deleteAdmin,
    getAdminStats
} = require('../controllers/adminManagementController');

// ===== ADMIN MANAGEMENT ROUTES =====
// All routes require super_admin role

// GET /api/admin/admins/stats - Get admin statistics
router.get('/stats', protect, authorize('super_admin'), getAdminStats);

// GET /api/admin/admins - Get all admins
router.get('/', protect, authorize('super_admin'), getAllAdmins);

// POST /api/admin/admins - Create new admin
router.post('/', protect, authorize('super_admin'), createAdmin);

// GET /api/admin/admins/:id - Get single admin
router.get('/:id', protect, authorize('super_admin'), getAdminById);

// PUT /api/admin/admins/:id - Update admin
router.put('/:id', protect, authorize('super_admin'), updateAdmin);

// PUT /api/admin/admins/:id/permissions - Update admin permissions
router.put('/:id/permissions', protect, authorize('super_admin'), updateAdminPermissions);

// DELETE /api/admin/admins/:id - Delete admin
router.delete('/:id', protect, authorize('super_admin'), deleteAdmin);

module.exports = router;
