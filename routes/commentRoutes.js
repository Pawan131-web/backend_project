// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Add comment to post
router.post('/:postId/comments', commentController.addComment);

// Get comments for a post
router.get('/:postId/comments', commentController.getComments);

// Delete comment
router.delete('/:postId/comments/:commentId', commentController.deleteComment);

module.exports = router;
