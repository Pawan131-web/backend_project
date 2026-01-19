const User = require('../models/User');
const Notification = require('../models/Notification');

// ===== GET ALL ORGANIZATIONS =====
// GET /api/admin/organizations
exports.getAllOrganizations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '', // verified, unverified, active, blocked
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching organizations with filters:', { page, limit, search, status });

        // Build query for organizations only
        let query = { userType: 'organization' };

        // Search by name, username, or email
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by status
        if (status === 'verified') {
            query.isVerified = true;
        } else if (status === 'unverified') {
            query.isVerified = false;
        } else if (status === 'active') {
            query.isActive = true;
        } else if (status === 'blocked') {
            query.isActive = false;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get organizations with pagination
        const organizations = await User.find(query)
            .select('fullName username email isVerified isActive createdAt orgVerificationStatus orgRegistrationNumber')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await User.countDocuments(query);

        // Format response
        const formattedOrgs = organizations.map(org => ({
            id: org._id,
            fullName: org.fullName,
            username: org.username,
            email: org.email,
            isVerified: org.isVerified,
            isActive: org.isActive,
            verificationStatus: org.orgVerificationStatus || (org.isVerified ? 'verified' : 'pending'),
            accountStatus: org.isActive ? 'active' : 'blocked',
            createdAt: org.createdAt,
            orgVerificationStatus: org.orgVerificationStatus,
            orgRegistrationNumber: org.orgRegistrationNumber
        }));

        console.log(`✅ Found ${organizations.length} organizations`);

        res.status(200).json({
            success: true,
            count: organizations.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            organizations: formattedOrgs
        });

    } catch (error) {
        console.error('❌ Get all organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organizations',
            error: error.message
        });
    }
};

// ===== GET PENDING ORGANIZATIONS =====
// GET /api/admin/organizations/pending
exports.getPendingOrganizations = async (req, res) => {
    try {
        console.log('🔍 Fetching pending organizations...');

        const pendingOrgs = await User.find({
            userType: 'organization',
            isActive: true,
            orgVerificationStatus: 'pending'
        })
        .select('fullName username email createdAt orgVerificationStatus orgRegistrationNumber orgVerificationDocuments')
        .sort({ createdAt: -1 });

        console.log(`📊 Found ${pendingOrgs.length} pending organizations`);

        res.status(200).json({
            success: true,
            count: pendingOrgs.length,
            organizations: pendingOrgs.map(org => ({
                id: org._id,
                fullName: org.fullName,
                username: org.username,
                email: org.email,
                createdAt: org.createdAt,
                waitingDays: Math.floor((Date.now() - org.createdAt) / (1000 * 60 * 60 * 24)),
                orgVerificationStatus: org.orgVerificationStatus,
                orgRegistrationNumber: org.orgRegistrationNumber,
                verificationDocuments: (org.orgVerificationDocuments || []).flatMap(d => (d.files || []))
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching pending organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching pending organizations',
            error: error.message
        });
    }
};

// ===== GET SINGLE ORGANIZATION =====
// GET /api/admin/organizations/:id
exports.getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching organization ID: ${id}`);

        const organization = await User.findById(id)
            .select('-password -verificationCode -codeExpires -verificationAttempts');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        if (organization.userType !== 'organization') {
            return res.status(400).json({
                success: false,
                message: 'User is not an organization'
            });
        }

        // Get additional stats (placeholder for future features)
        const orgStats = {
            totalPosts: 0, // Will need Post model
            totalInternships: 0, // Will need Internship model
            totalApplications: 0 // Will need Application model
        };

        console.log(`✅ Organization found: ${organization.fullName}`);

        res.status(200).json({
            success: true,
            organization: {
                id: organization._id,
                fullName: organization.fullName,
                username: organization.username,
                email: organization.email,
                isVerified: organization.isVerified,
                isActive: organization.isActive,
                createdAt: organization.createdAt,
                orgVerificationStatus: organization.orgVerificationStatus,
                orgRegistrationNumber: organization.orgRegistrationNumber,
                orgVerifiedAt: organization.orgVerifiedAt,
                orgVerificationSubmittedAt: organization.orgVerificationSubmittedAt,
                orgRejectionReason: organization.orgRejectionReason,
                orgVerificationDocuments: organization.orgVerificationDocuments || [],
                verificationDocuments: (organization.orgVerificationDocuments || []).flatMap(d => (d.files || [])),
                ...orgStats
            }
        });

    } catch (error) {
        console.error('❌ Get organization by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organization',
            error: error.message
        });
    }
};

// ===== VERIFY ORGANIZATION =====
// PUT /api/admin/organizations/:id/verify
exports.verifyOrganization = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`✅ Verifying organization ID: ${id}`);

        const organization = await User.findById(id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        if (organization.userType !== 'organization') {
            return res.status(400).json({
                success: false,
                message: 'User is not an organization'
            });
        }

        if (organization.orgVerificationStatus === 'verified') {
            return res.status(400).json({
                success: false,
                message: 'Organization is already verified'
            });
        }

        // Mark as verified
        organization.isVerified = true;
        organization.verificationCode = undefined;
        organization.codeExpires = undefined;
        organization.orgVerificationStatus = 'verified';
        organization.orgVerifiedAt = new Date();
        organization.orgRejectionReason = undefined;
        await organization.save();

        // Create notification for the organization
        await Notification.create({
            userId: organization._id,
            type: 'verification_approved',
            title: 'Organization Verified! 🎉',
            message: 'Congratulations! Your organization has been verified. You can now post internships and access all platform features.',
            data: { verifiedAt: organization.orgVerifiedAt }
        });

        console.log(`🎉 Organization verified: ${organization.fullName} (${organization.username})`);
        console.log(`👤 Verified by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Organization verified successfully!',
            organization: {
                id: organization._id,
                fullName: organization.fullName,
                username: organization.username,
                email: organization.email,
                isVerified: true,
                verifiedAt: organization.orgVerifiedAt,
                orgVerificationStatus: organization.orgVerificationStatus
            }
        });

    } catch (error) {
        console.error('❌ Error verifying organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server error verifying organization',
            error: error.message
        });
    }
};

// ===== REJECT ORGANIZATION =====
// PUT /api/admin/organizations/:id/reject
exports.rejectOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, deleteAccount = false } = req.body;

        console.log(`❌ Rejecting organization ID: ${id}`);
        console.log(`Reason: ${reason || 'No reason provided'}`);
        console.log(`Delete account: ${deleteAccount}`);

        const organization = await User.findById(id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        if (organization.userType !== 'organization') {
            return res.status(400).json({
                success: false,
                message: 'User is not an organization'
            });
        }

        let message = '';

        if (deleteAccount) {
            // Delete the organization account
            await User.findByIdAndDelete(id);
            message = `Organization ${organization.fullName} rejected and deleted`;
            console.log(`🗑️ Organization deleted: ${organization.fullName}`);
        } else {
            // Block the account using isBlocked
            await User.findByIdAndUpdate(id, {
                $set: {
                    isBlocked: true,
                    blockReason: reason || 'Organization verification rejected',
                    blockedAt: new Date(),
                    blockedBy: req.admin._id,
                    orgVerificationStatus: 'rejected',
                    orgRejectionReason: reason || 'Rejected by admin'
                }
            });
            
            // Create notification for the organization
            await Notification.create({
                userId: organization._id,
                type: 'verification_rejected',
                title: 'Verification Not Approved',
                message: `Your organization verification was not approved. Reason: ${reason || 'Does not meet platform requirements'}. Please contact support for more information.`,
                data: { reason: reason || 'Does not meet platform requirements' }
            });
            
            message = `Organization ${organization.fullName} rejected and blocked`;
            console.log(`🚫 Organization blocked: ${organization.fullName}`);
        }

        console.log(`👤 Rejected by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message,
            action: deleteAccount ? 'deleted' : 'blocked',
            organization: {
                id: organization._id,
                fullName: organization.fullName,
                email: organization.email,
                orgVerificationStatus: organization.orgVerificationStatus
            }
        });

    } catch (error) {
        console.error('❌ Error rejecting organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server error rejecting organization',
            error: error.message
        });
    }
};

// ===== GET ORGANIZATION STATISTICS =====
// GET /api/admin/organizations/stats
exports.getOrganizationStats = async (req, res) => {
    try {
        console.log('📊 Calculating organization statistics...');

        // Get counts
        const totalOrgs = await User.countDocuments({ userType: 'organization' });
        const verifiedOrgs = await User.countDocuments({ 
            userType: 'organization', 
            orgVerificationStatus: 'verified'
        });
        const pendingOrgs = await User.countDocuments({ 
            userType: 'organization', 
            orgVerificationStatus: 'pending',
            isActive: true
        });
        const blockedOrgs = await User.countDocuments({ 
            userType: 'organization', 
            isActive: false 
        });

        // Get today's registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrgs = await User.countDocuments({
            userType: 'organization',
            createdAt: { $gte: today }
        });

        // Get this week's registrations
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weekOrgs = await User.countDocuments({
            userType: 'organization',
            createdAt: { $gte: weekAgo }
        });

        // Get this month's registrations
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        
        const monthOrgs = await User.countDocuments({
            userType: 'organization',
            createdAt: { $gte: monthAgo }
        });

        // Calculate verification rate
        const verificationRate = totalOrgs > 0 
            ? Math.round((verifiedOrgs / totalOrgs) * 100) 
            : 0;

        // Calculate growth
        const previousMonthOrgs = await User.countDocuments({
            userType: 'organization',
            createdAt: { $lt: monthAgo }
        });
        
        const growthPercentage = previousMonthOrgs > 0 
            ? Math.round(((totalOrgs - previousMonthOrgs) / previousMonthOrgs) * 100)
            : 100;

        console.log('✅ Statistics calculated successfully');

        res.status(200).json({
            success: true,
            stats: {
                total: totalOrgs,
                verified: verifiedOrgs,
                pending: pendingOrgs,
                blocked: blockedOrgs,
                todayRegistrations: todayOrgs,
                weekRegistrations: weekOrgs,
                monthRegistrations: monthOrgs,
                verificationRate,
                growthPercentage,
                averageDailyRegistrations: Math.round(weekOrgs / 7)
            },
            percentages: {
                verified: verificationRate,
                pending: totalOrgs > 0 ? Math.round((pendingOrgs / totalOrgs) * 100) : 0,
                blocked: totalOrgs > 0 ? Math.round((blockedOrgs / totalOrgs) * 100) : 0
            }
        });

    } catch (error) {
        console.error('❌ Get organization stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organization statistics',
            error: error.message
        });
    }
};

// ===== BLOCK USER (Student or Organization) =====
// PUT /api/admin/users/:id/block
exports.blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, adminId } = req.body;

        console.log(`🚫 Blocking user: ${id}`);

        const blockReason = reason || 'Blocked by admin';
        const blockUpdate = {
            isBlocked: true,
            blockReason,
            blockedAt: new Date()
        };
        if (adminId) blockUpdate.blockedBy = adminId;

        const user = await User.findByIdAndUpdate(
            id,
            { $set: blockUpdate },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create notification for blocked user
        await Notification.create({
            userId: user._id,
            type: 'account_blocked',
            title: 'Account Blocked',
            message: `Your account has been blocked. Reason: ${blockReason || 'Violation of platform guidelines'}. You can send an appeal to the admin.`,
            isRead: false
        });

        console.log(`✅ User ${user.fullName} blocked successfully`);

        res.status(200).json({
            success: true,
            message: `${user.userType === 'student' ? 'Student' : 'Organization'} blocked successfully`,
            user: {
                id: user._id,
                fullName: user.fullName,
                userType: user.userType,
                isBlocked: user.isBlocked,
                blockReason: user.blockReason
            }
        });

    } catch (error) {
        console.error('❌ Block user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error blocking user',
            error: error.message
        });
    }
};

// ===== UNBLOCK USER =====
// PUT /api/admin/users/:id/unblock
exports.unblockUser = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`✅ Unblocking user: ${id}`);

        const user = await User.findByIdAndUpdate(
            id,
            {
                $set: {
                    isBlocked: false
                },
                $unset: {
                    blockReason: 1,
                    blockedAt: 1,
                    blockedBy: 1
                }
            },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create notification for unblocked user
        await Notification.create({
            userId: user._id,
            type: 'account_unblocked',
            title: 'Account Unblocked',
            message: 'Your account has been unblocked. You can now use all platform features again.',
            isRead: false
        });

        console.log(`✅ User ${user.fullName} unblocked successfully`);

        res.status(200).json({
            success: true,
            message: `${user.userType === 'student' ? 'Student' : 'Organization'} unblocked successfully`,
            user: {
                id: user._id,
                fullName: user.fullName,
                userType: user.userType,
                isBlocked: user.isBlocked
            }
        });

    } catch (error) {
        console.error('❌ Unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error unblocking user',
            error: error.message
        });
    }
};

// ===== GET ALL STUDENTS =====
// GET /api/admin/students
exports.getAllStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;

        let query = { userType: 'student' };

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'blocked') {
            query.isBlocked = true;
        } else if (status === 'active') {
            query.isBlocked = { $ne: true };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const students = await User.find(query)
            .select('fullName username email isVerified isActive isBlocked blockReason createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: students.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            students: students.map(s => ({
                id: s._id,
                fullName: s.fullName,
                username: s.username,
                email: s.email,
                isBlocked: s.isBlocked || false,
                blockReason: s.blockReason,
                createdAt: s.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Get students error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching students',
            error: error.message
        });
    }
};

// ===== SEARCH ALL USERS =====
// GET /api/admin/users/search
exports.searchAllUsers = async (req, res) => {
    try {
        const { query: searchQuery = '', type = '' } = req.query;

        let filter = {};
        if (type === 'student') filter.userType = 'student';
        else if (type === 'organization') filter.userType = 'organization';

        if (searchQuery) {
            filter.$or = [
                { fullName: { $regex: searchQuery, $options: 'i' } },
                { username: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('fullName username email userType isVerified isBlocked blockReason orgVerificationStatus createdAt')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                id: u._id,
                fullName: u.fullName,
                username: u.username,
                email: u.email,
                userType: u.userType,
                isBlocked: u.isBlocked || false,
                blockReason: u.blockReason,
                orgVerificationStatus: u.orgVerificationStatus,
                createdAt: u.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error searching users',
            error: error.message
        });
    }
};
