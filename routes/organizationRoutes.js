// routes/organizationRoutes.js
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');

// Get organization profile
router.get('/:orgId', organizationController.getOrgProfile);

// Update organization profile
router.put('/:orgId', organizationController.updateOrgProfile);

// Upload verification documents
router.post('/:orgId/verification-docs', organizationController.uploadVerificationDocs);

module.exports = router;
