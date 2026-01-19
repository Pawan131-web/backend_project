// controllers/organizationController.js
const User = require('../models/User');

// Update organization profile
exports.updateOrgProfile = async (req, res) => {
    try {
        const { orgId } = req.params;
        const updates = req.body;

        console.log('📝 Updating organization profile:', orgId);

        const org = await User.findById(orgId);
        if (!org || org.userType !== 'organization') {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Update allowed fields
        const allowedUpdates = [
            'fullName', 'bio', 'description', 'website', 'location',
            'phone', 'industry', 'companySize', 'foundedYear',
            'socialLinks', 'linkedin', 'twitter', 'facebook',
            'profilePicture', 'coverImage', 'logo'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                org[field] = updates[field];
            }
        });

        await org.save();

        console.log('✅ Organization profile updated');

        res.json({
            success: true,
            message: 'Organization profile updated successfully',
            organization: {
                id: org._id,
                fullName: org.fullName,
                username: org.username,
                email: org.email,
                bio: org.bio,
                description: org.description,
                website: org.website,
                location: org.location,
                phone: org.phone,
                industry: org.industry,
                companySize: org.companySize,
                foundedYear: org.foundedYear,
                socialLinks: org.socialLinks,
                profilePicture: org.profilePicture,
                coverImage: org.coverImage,
                logo: org.logo,
                isVerified: org.isVerified
            }
        });

    } catch (error) {
        console.error('❌ Error updating organization profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get organization profile
exports.getOrgProfile = async (req, res) => {
    try {
        const { orgId } = req.params;

        const org = await User.findById(orgId).select('-password -verificationCode');
        
        if (!org || org.userType !== 'organization') {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.json({
            success: true,
            organization: {
                id: org._id,
                fullName: org.fullName,
                username: org.username,
                email: org.email,
                userType: org.userType,
                bio: org.bio,
                description: org.description,
                website: org.website,
                location: org.location,
                phone: org.phone,
                industry: org.industry,
                companySize: org.companySize,
                foundedYear: org.foundedYear,
                socialLinks: org.socialLinks,
                linkedin: org.linkedin,
                twitter: org.twitter,
                facebook: org.facebook,
                profilePicture: org.profilePicture,
                coverImage: org.coverImage,
                logo: org.logo,
                isVerified: org.isVerified,
                isActive: org.isActive,
                createdAt: org.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error fetching organization profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Upload verification documents
exports.uploadVerificationDocs = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { documents } = req.body;

        const org = await User.findById(orgId);
        if (!org || org.userType !== 'organization') {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Store verification documents
        if (!org.verificationDocuments) {
            org.verificationDocuments = [];
        }

        if (Array.isArray(documents)) {
            org.verificationDocuments.push(...documents);
        } else {
            org.verificationDocuments.push(documents);
        }

        await org.save();

        res.json({
            success: true,
            message: 'Verification documents uploaded',
            documents: org.verificationDocuments
        });

    } catch (error) {
        console.error('❌ Error uploading verification documents:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
