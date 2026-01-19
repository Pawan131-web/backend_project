// controllers/profileViewController.js
const User = require('../models/User');
const Notification = require('../models/Notification');

// Track profile view
exports.trackProfileView = async (req, res) => {
    try {
        const { profileUserId } = req.params;
        const { viewerId } = req.body;

        if (!viewerId) {
            return res.status(400).json({
                success: false,
                message: 'viewerId is required'
            });
        }

        const profileUser = await User.findById(profileUserId);
        if (!profileUser) {
            return res.status(404).json({
                success: false,
                message: 'Profile user not found'
            });
        }

        const viewer = await User.findById(viewerId).select('fullName username userType');
        if (!viewer) {
            return res.status(404).json({
                success: false,
                message: 'Viewer not found'
            });
        }

        // Initialize profile views if not exists
        if (!profileUser.profileViews) {
            profileUser.profileViews = [];
        }

        // Check if this viewer already viewed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingView = profileUser.profileViews.find(view => 
            view.userId && view.userId.toString() === viewerId.toString() &&
            view.viewedAt >= today
        );

        if (!existingView) {
            // Add new view
            profileUser.profileViews.push({
                userId: viewerId,
                viewedAt: new Date()
            });

            // Increment view count
            profileUser.profileViewCount = (profileUser.profileViewCount || 0) + 1;

            await profileUser.save();

            // Create notification (if not viewing own profile)
            try {
                if (profileUserId !== viewerId) {
                    await Notification.create({
                        userId: profileUserId,
                        type: 'profile_viewed',
                        title: 'Profile View',
                        message: `${viewer.fullName} viewed your profile`,
                        relatedId: viewerId,
                        relatedModel: 'User',
                        isRead: false
                    });
                }
            } catch (notifError) {
                console.error('Error creating profile view notification:', notifError);
            }
        }

        res.json({
            success: true,
            message: 'Profile view tracked',
            viewCount: profileUser.profileViewCount
        });

    } catch (error) {
        console.error('Track profile view error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get profile views
exports.getProfileViews = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId).populate({
            path: 'profileViews.userId',
            select: 'fullName username profilePicture userType'
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const views = user.profileViews || [];
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedViews = views.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            views: paginatedViews.map(view => ({
                user: view.userId ? {
                    id: view.userId._id,
                    fullName: view.userId.fullName,
                    username: view.userId.username,
                    profilePicture: view.userId.profilePicture,
                    userType: view.userId.userType
                } : null,
                viewedAt: view.viewedAt
            })),
            total: views.length,
            totalViewCount: user.profileViewCount || 0,
            page: parseInt(page),
            pages: Math.ceil(views.length / parseInt(limit))
        });

    } catch (error) {
        console.error('Get profile views error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
