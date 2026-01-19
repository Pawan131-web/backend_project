const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../middleware/adminAuth');
const {
    getAllAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    sendAnnouncement,
    getAnnouncementStats
} = require('../controllers/adminAnnouncementController');

// ===== ANNOUNCEMENT ROUTES =====
// All routes require admin authentication and sendAnnouncements permission

// GET /api/admin/announcements/stats - Get announcement statistics
router.get('/stats', protect, hasPermission('sendAnnouncements'), getAnnouncementStats);

// GET /api/admin/announcements - Get all announcements
router.get('/', protect, hasPermission('sendAnnouncements'), getAllAnnouncements);

// POST /api/admin/announcements - Create new announcement
router.post('/', protect, hasPermission('sendAnnouncements'), createAnnouncement);

// GET /api/admin/announcements/:id - Get single announcement
router.get('/:id', protect, hasPermission('sendAnnouncements'), getAnnouncementById);

// PUT /api/admin/announcements/:id - Update announcement
router.put('/:id', protect, hasPermission('sendAnnouncements'), updateAnnouncement);

// DELETE /api/admin/announcements/:id - Delete announcement
router.delete('/:id', protect, hasPermission('sendAnnouncements'), deleteAnnouncement);

// POST /api/admin/announcements/:id/send - Send announcement to users
router.post('/:id/send', protect, hasPermission('sendAnnouncements'), sendAnnouncement);

module.exports = router;
