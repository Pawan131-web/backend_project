const express = require('express');
const router = express.Router();
const { protect, hasPermission } = require('../middleware/adminAuth');
const {
    getAllSkills,
    getSkillById,
    createSkill,
    updateSkill,
    deleteSkill,
    getSkillCategories,
    bulkAddSkills,
    getSkillStats
} = require('../controllers/adminSkillController');

// ===== SKILL ROUTES =====
// All routes require admin authentication and manageSkills permission

// GET /api/admin/skills/stats - Get skill statistics
router.get('/stats', protect, hasPermission('manageSkills'), getSkillStats);

// GET /api/admin/skills/categories - Get all skill categories
router.get('/categories', protect, hasPermission('manageSkills'), getSkillCategories);

// POST /api/admin/skills/bulk - Bulk add skills
router.post('/bulk', protect, hasPermission('manageSkills'), bulkAddSkills);

// GET /api/admin/skills - Get all skills
router.get('/', protect, hasPermission('manageSkills'), getAllSkills);

// POST /api/admin/skills - Create new skill
router.post('/', protect, hasPermission('manageSkills'), createSkill);

// GET /api/admin/skills/:id - Get single skill
router.get('/:id', protect, hasPermission('manageSkills'), getSkillById);

// PUT /api/admin/skills/:id - Update skill
router.put('/:id', protect, hasPermission('manageSkills'), updateSkill);

// DELETE /api/admin/skills/:id - Delete skill
router.delete('/:id', protect, hasPermission('manageSkills'), deleteSkill);

module.exports = router;
