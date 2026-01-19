// controllers/profileController.js
const User = require('../models/User');

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body;

        console.log('📝 Updating profile for user:', userId);

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update allowed fields
        const allowedUpdates = [
            'fullName', 'bio', 'headline', 'location', 'phone',
            'education', 'experience', 'skills', 'projects',
            'certifications', 'languages', 'hobbies', 'interests',
            'socialLinks', 'website', 'github', 'linkedin',
            'profilePicture', 'coverImage'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });

        await user.save();

        console.log('✅ Profile updated successfully');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                bio: user.bio,
                headline: user.headline,
                location: user.location,
                phone: user.phone,
                education: user.education,
                experience: user.experience,
                skills: user.skills,
                projects: user.projects,
                certifications: user.certifications,
                languages: user.languages,
                hobbies: user.hobbies,
                interests: user.interests,
                socialLinks: user.socialLinks,
                profilePicture: user.profilePicture,
                coverImage: user.coverImage
            }
        });

    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: error.message
        });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password -verificationCode');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                bio: user.bio,
                headline: user.headline,
                location: user.location,
                phone: user.phone,
                education: user.education,
                experience: user.experience,
                skills: user.skills,
                projects: user.projects,
                certifications: user.certifications,
                languages: user.languages,
                hobbies: user.hobbies,
                interests: user.interests,
                socialLinks: user.socialLinks,
                website: user.website,
                github: user.github,
                linkedin: user.linkedin,
                profilePicture: user.profilePicture,
                coverImage: user.coverImage,
                isVerified: user.isVerified,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile',
            error: error.message
        });
    }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
    try {
        const { userId } = req.params;
        const { profilePicture } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.profilePicture = profilePicture;
        await user.save();

        res.json({
            success: true,
            message: 'Profile picture updated',
            profilePicture: user.profilePicture
        });

    } catch (error) {
        console.error('❌ Error updating profile picture:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update cover image
exports.updateCoverImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const { coverImage } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.coverImage = coverImage;
        await user.save();

        res.json({
            success: true,
            message: 'Cover image updated',
            coverImage: user.coverImage
        });

    } catch (error) {
        console.error('❌ Error updating cover image:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
