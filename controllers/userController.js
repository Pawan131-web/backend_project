// controllers/userController.js
const User = require('../models/User');

// Search users by username or name
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }
        
        const searchQuery = query.trim().toLowerCase();
        
        // Search in username or fullName (case insensitive)
        const users = await User.find({
            $and: [
                { isVerified: true }, // Only show verified users
                { isActive: true },   // Only active users
                {
                    $or: [
                        { username: { $regex: searchQuery, $options: 'i' } },
                        { fullName: { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            ]
        })
        .select('fullName username email userType createdAt')
        .limit(20)
        .sort({ createdAt: -1 });
        
        // Don't return email for privacy unless needed
        const safeUsers = users.map(user => ({
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            userType: user.userType,
            createdAt: user.createdAt
        }));
        
        res.status(200).json({
            success: true,
            count: safeUsers.length,
            users: safeUsers
        });
        
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during search',
            error: error.message
        });
    }
};

// Get user profile by username
exports.getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ 
            username: username.toLowerCase(),
            isVerified: true,
            isActive: true
        }).select('fullName username email userType createdAt');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                userType: user.userType,
                joined: new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                })
            }
        });
        
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};