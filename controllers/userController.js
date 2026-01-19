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
        .select('fullName username email userType createdAt profilePicture')
        .limit(20)
        .sort({ createdAt: -1 });
        
        // Don't return email for privacy unless needed
        const safeUsers = users.map(user => ({
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            userType: user.userType,
            profilePicture: user.profilePicture || '',
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

// Update user profile picture
exports.updateProfilePicture = async (req, res) => {
    try {
        const { userId, profilePicture, coverPhoto } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update profile picture if provided
        if (profilePicture !== undefined) {
            user.profilePicture = profilePicture;
        }

        // Update cover photo if provided
        if (coverPhoto !== undefined) {
            user.coverPhoto = coverPhoto;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
                coverPhoto: user.coverPhoto
            }
        });

    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: error.message
        });
    }
};

// Get user profile by username (public view)
exports.getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ 
            username: username.toLowerCase(),
            isVerified: true,
            isActive: true
        }).select('fullName username email userType createdAt profilePicture coverPhoto title bio location skills education experience projects certifications socialLinks isVerified');
        
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
                profilePicture: user.profilePicture || '',
                coverPhoto: user.coverPhoto || '',
                title: user.title || '',
                bio: user.bio || '',
                location: user.location || '',
                skills: user.skills || [],
                education: user.education || [],
                experience: user.experience || [],
                projects: user.projects || [],
                certifications: user.certifications || [],
                socialLinks: user.socialLinks || {},
                isVerified: user.isVerified,
                createdAt: user.createdAt,
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

// Get own full profile by user ID (for profile editing)
exports.getMyProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('-password -verificationCode -codeExpires -verificationAttempts');
        
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
                email: user.email,
                userType: user.userType,
                profilePicture: user.profilePicture || '',
                coverPhoto: user.coverPhoto || '',
                title: user.title || '',
                bio: user.bio || '',
                location: user.location || '',
                website: user.website || '',
                phone: user.phone || '',
                skills: user.skills || [],
                education: user.education || [],
                experience: user.experience || [],
                projects: user.projects || [],
                certifications: user.certifications || [],
                socialLinks: user.socialLinks || {},
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('Get my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update full profile (unified endpoint for profile editing)
exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // List of allowed fields to update
        const allowedFields = [
            'fullName', 'title', 'bio', 'location', 'website', 'phone',
            'profilePicture', 'coverPhoto', 'skills', 'education',
            'experience', 'projects', 'certifications', 'socialLinks'
        ];
        
        // Update only allowed fields
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });
        
        await user.save();
        
        // Return updated user data
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                profilePicture: user.profilePicture || '',
                coverPhoto: user.coverPhoto || '',
                title: user.title || '',
                bio: user.bio || '',
                location: user.location || '',
                website: user.website || '',
                phone: user.phone || '',
                skills: user.skills || [],
                education: user.education || [],
                experience: user.experience || [],
                projects: user.projects || [],
                certifications: user.certifications || [],
                socialLinks: user.socialLinks || {}
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: error.message
        });
    }
};