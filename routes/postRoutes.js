const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// Get all internships (public - for students to browse)
router.get('/internships', postController.getAllInternships);

// Get internships by organization ID
router.get('/internships/org/:orgId', postController.getOrgInternships);

// Create internship post (for organizations)
router.post('/internship', postController.createInternshipPost);

// Update internship post (for organizations)
router.put('/internship/:postId', postController.updateInternshipPost);

// Delete internship post (for organizations)
router.delete('/internship/:postId', postController.deleteInternshipPost);

// Get all feed posts (home feed)
router.get('/feed', postController.getAllFeedPosts);

// Create general feed post
router.post('/feed', postController.createFeedPost);

// Like/unlike a post (toggle)
router.put('/:postId/like', postController.toggleLikePost);

// Save/unsave a post (toggle)
router.put('/:postId/save', postController.toggleSavePost);

// Add comment to post
router.post('/:postId/comment', postController.addComment);

// Get post comments
router.get('/:postId/comments', postController.getPostComments);

// Delete post (owner only)
router.delete('/:postId', postController.deletePost);

// Update post (owner only)
router.put('/:postId', postController.updatePost);

// Get user's own posts
router.get('/user/:userId', postController.getUserPosts);

// Get user's saved posts
router.get('/saved/:userId', postController.getSavedPosts);

// ===== RECOMMENDATION ROUTES =====
// Get recommended internships for a student (POST to send skills in body)
router.post('/recommendations/:userId', postController.getRecommendedInternships);

// Calculate match for a specific internship
router.post('/internship/:internshipId/match', postController.calculateMatchForInternship);

// Get top applicants for an internship (for organizations)
router.get('/internship/:internshipId/top-applicants', postController.getTopApplicantsForInternship);

// Get internships with recommendations (combined endpoint for Explore page)
router.post('/internships/explore', postController.getInternshipsWithRecommendations);

module.exports = router;
