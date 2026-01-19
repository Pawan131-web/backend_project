const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../middleware/adminAuth');
const {
    getAllOrganizations,
    getPendingOrganizations,
    getOrganizationById,
    verifyOrganization,
    rejectOrganization,
    getOrganizationStats
} = require('../controllers/adminOrgController');

// ===== ORGANIZATION ROUTES =====
// All routes require admin authentication and manageOrgs permission

// GET /api/admin/organizations/stats - Get organization statistics
router.get('/stats', protect, hasPermission('manageOrgs'), getOrganizationStats);

// GET /api/admin/organizations/pending - Get pending organizations
router.get('/pending', protect, hasPermission('manageOrgs'), getPendingOrganizations);

// GET /api/admin/organizations - Get all organizations with filters
router.get('/', protect, hasPermission('manageOrgs'), getAllOrganizations);

// GET /api/admin/organizations/:id - Get single organization
router.get('/:id', protect, hasPermission('manageOrgs'), getOrganizationById);

// PUT /api/admin/organizations/:id/verify - Verify organization
router.put('/:id/verify', protect, hasPermission('manageOrgs'), verifyOrganization);

// PUT /api/admin/organizations/:id/reject - Reject organization
router.put('/:id/reject', protect, hasPermission('manageOrgs'), rejectOrganization);

module.exports = router;
