const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protect, authorize, hasPermission } = require('../middleware/adminAuth');

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('super_admin', 'admin'));

// User management routes
router.get('/', hasPermission('manageUsers'), adminUserController.getAllUsers);
router.get('/stats', hasPermission('manageUsers'), adminUserController.getUserStats);
router.get('/:id', hasPermission('manageUsers'), adminUserController.getUserById);
router.put('/:id/status', hasPermission('manageUsers'), adminUserController.updateUserStatus);
router.post('/bulk-actions', hasPermission('manageUsers'), adminUserController.bulkUserActions);

module.exports = router;