// controllers/commentController.js
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Add comment to post
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId, content } = req.body;

        if (!userId || !content) {
            return res.status(400).json({
                success: false,
                message: 'userId and content are required'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const user = await User.findById(userId).select('fullName username profilePicture');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Add comment to post
        const comment = {
            userId: user._id,
            content: content.trim(),
            createdAt: new Date()
        };

        if (!post.comments) {
            post.comments = [];
        }
        post.comments.push(comment);
        
        // Increment comment count
        post.commentCount = (post.commentCount || 0) + 1;

        await post.save();

        // Create notification for post owner (if not commenting on own post)
        try {
            if (post.userId.toString() !== userId.toString()) {
                await Notification.create({
                    userId: post.userId,
                    type: 'post_commented',
                    title: 'New Comment',
                    message: `${user.fullName} commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                    relatedId: postId,
                    relatedModel: 'Post',
                    isRead: false
                });
            }
        } catch (notifError) {
            console.error('Error creating comment notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: {
                id: comment._id || post.comments[post.comments.length - 1]._id,
                content: comment.content,
                createdAt: comment.createdAt,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    profilePicture: user.profilePicture
                }
            },
            commentCount: post.commentCount
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get comments for a post
exports.getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const post = await Post.findById(postId).populate({
            path: 'comments.userId',
            select: 'fullName username profilePicture'
        });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const comments = post.comments || [];
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComments = comments.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            comments: paginatedComments.map(comment => ({
                id: comment._id,
                content: comment.content,
                createdAt: comment.createdAt,
                user: comment.userId ? {
                    id: comment.userId._id,
                    fullName: comment.userId.fullName,
                    username: comment.userId.username,
                    profilePicture: comment.userId.profilePicture
                } : null
            })),
            total: comments.length,
            page: parseInt(page),
            pages: Math.ceil(comments.length / parseInt(limit))
        });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { userId } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
        if (commentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        const comment = post.comments[commentIndex];

        // Check if user is the comment owner or post owner
        if (comment.userId.toString() !== userId && post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        post.comments.splice(commentIndex, 1);
        post.commentCount = Math.max(0, (post.commentCount || 1) - 1);

        await post.save();

        res.json({
            success: true,
            message: 'Comment deleted successfully',
            commentCount: post.commentCount
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
