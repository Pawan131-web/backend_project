const User = require('../models/User');

// ===== GET ALL USERS =====
// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            userType = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        let query = {};

        // Search by name, username, or email
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by user type
        if (userType) {
            query.userType = userType;
        }

        // Filter by status
        if (status === 'active') {
            query.isActive = true;
            query.isBlocked = { $ne: true };
        } else if (status === 'blocked') {
            query.isBlocked = true;
        } else if (status === 'verified') {
            query.isVerified = true;
        } else if (status === 'unverified') {
            query.isVerified = false;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get users with pagination
        const users = await User.find(query)
            .select('fullName username email userType isActive isBlocked blockReason isVerified createdAt')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination
        const totalUsers = await User.countDocuments(query);

        // Format response
        const formattedUsers = users.map(user => {
            const effectiveIsActive = user.isBlocked ? false : user.isActive;
            return {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isActive: effectiveIsActive,
                isBlocked: user.isBlocked || false,
                blockReason: user.blockReason,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                status: effectiveIsActive ? 'active' : 'blocked',
                verificationStatus: user.isVerified ? 'verified' : 'pending'
            };
        });

        res.status(200).json({
            success: true,
            count: users.length,
            total: totalUsers,
            page: parseInt(page),
            pages: Math.ceil(totalUsers / limitNum),
            users: formattedUsers
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users',
            error: error.message
        });
    }
};

// ===== GET USER BY ID =====
// GET /api/admin/users/:id
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password -verificationCode -codeExpires -verificationAttempts');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get additional stats (in a real app, you might have more data)
        const userStats = {
            totalPosts: 0, // You'll need a Post model for this
            totalApplications: 0, // You'll need an Application model
            lastActive: user.lastLogin || user.createdAt
        };

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isActive: user.isBlocked ? false : user.isActive,
                isBlocked: user.isBlocked || false,
                blockReason: user.blockReason,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                ...userStats
            }
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user',
            error: error.message
        });
    }
};

// ===== UPDATE USER STATUS =====
// PUT /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body;

        if (!action || !['block', 'unblock', 'verify', 'delete'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action required: block, unblock, verify, or delete'
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let message = '';
        let updateOps = {};

        switch (action) {
            case 'block':
                const blockReason = reason || 'Blocked by admin';
                updateOps = {
                    $set: {
                        isBlocked: true,
                        blockReason,
                        blockedAt: new Date(),
                        blockedBy: req.admin?._id
                    }
                };
                message = `User ${user.fullName} blocked successfully`;
                break;

            case 'unblock':
                updateOps = {
                    $set: {
                        isBlocked: false
                    },
                    $unset: {
                        blockReason: 1,
                        blockedAt: 1,
                        blockedBy: 1
                    }
                };
                message = `User ${user.fullName} unblocked successfully`;
                break;

            case 'verify':
                updateOps = {
                    $set: {
                        isVerified: true
                    },
                    $unset: {
                        verificationCode: 1,
                        codeExpires: 1
                    }
                };
                message = `User ${user.fullName} verified successfully`;
                break;

            case 'delete':
                await User.findByIdAndDelete(id);
                return res.status(200).json({
                    success: true,
                    message: `User ${user.fullName} deleted successfully`
                });
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(id, updateOps, { new: true });
        const effectiveIsActive = updatedUser.isBlocked ? false : updatedUser.isActive;

        // Log admin action (you should create an ActivityLog model)
        console.log(`Admin ${req.admin.email} ${action}ed user ${user.email}. Reason: ${reason || 'No reason provided'}`);

        res.status(200).json({
            success: true,
            message: message,
            user: {
                id: updatedUser._id,
                fullName: updatedUser.fullName,
                username: updatedUser.username,
                email: updatedUser.email,
                isActive: effectiveIsActive,
                isBlocked: updatedUser.isBlocked || false,
                blockReason: updatedUser.blockReason,
                isVerified: updatedUser.isVerified
            }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user',
            error: error.message
        });
    }
};

// ===== BULK USER ACTIONS =====
// POST /api/admin/users/bulk-actions
exports.bulkUserActions = async (req, res) => {
    try {
        const { userIds, action, reason } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array required'
            });
        }

        if (!action || !['block', 'unblock', 'verify', 'delete'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action required: block, unblock, verify, or delete'
            });
        }

        let updateOps = {};
        let message = '';

        switch (action) {
            case 'block':
                updateOps = {
                    $set: {
                        isBlocked: true,
                        blockReason: reason || 'Blocked by admin',
                        blockedAt: new Date(),
                        blockedBy: req.admin?._id
                    }
                };
                message = `${userIds.length} users blocked successfully`;
                break;

            case 'unblock':
                updateOps = {
                    $set: {
                        isBlocked: false
                    },
                    $unset: {
                        blockReason: 1,
                        blockedAt: 1,
                        blockedBy: 1
                    }
                };
                message = `${userIds.length} users unblocked successfully`;
                break;

            case 'verify':
                updateOps = {
                    $set: {
                        isVerified: true
                    },
                    $unset: {
                        verificationCode: 1,
                        codeExpires: 1
                    }
                };
                message = `${userIds.length} users verified successfully`;
                break;

            case 'delete':
                await User.deleteMany({ _id: { $in: userIds } });
                return res.status(200).json({
                    success: true,
                    message: `${userIds.length} users deleted successfully`
                });
        }

        // Update multiple users
        await User.updateMany(
            { _id: { $in: userIds } },
            updateOps
        );

        // Get updated users for response
        const updatedUsers = await User.find({ _id: { $in: userIds } })
            .select('fullName username email userType isActive isBlocked blockReason');
        const formattedUsers = updatedUsers.map(u => ({
            id: u._id,
            fullName: u.fullName,
            username: u.username,
            email: u.email,
            userType: u.userType,
            isActive: u.isBlocked ? false : u.isActive,
            isBlocked: u.isBlocked || false,
            blockReason: u.blockReason
        }));

        console.log(`Admin ${req.admin.email} performed bulk ${action} on ${userIds.length} users. Reason: ${reason || 'No reason provided'}`);

        res.status(200).json({
            success: true,
            message: message,
            count: userIds.length,
            users: formattedUsers
        });

    } catch (error) {
        console.error('Bulk user actions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error performing bulk action',
            error: error.message
        });
    }
};

// ===== GET USER STATISTICS =====
// GET /api/admin/users/stats
exports.getUserStats = async (req, res) => {
    try {
        // Get counts by user type and status
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ userType: 'student' });
        const totalOrganizations = await User.countDocuments({ userType: 'organization' });
        
        const activeUsers = await User.countDocuments({ isActive: true, isBlocked: { $ne: true } });
        const blockedUsers = await User.countDocuments({ isBlocked: true });
        
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const unverifiedUsers = await User.countDocuments({ isVerified: false });

        // Get today's registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRegistrations = await User.countDocuments({
            createdAt: { $gte: today }
        });

        // Get this week's registrations
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weekRegistrations = await User.countDocuments({
            createdAt: { $gte: weekAgo }
        });

        // Get growth percentage (simplified)
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        
        const previousMonthUsers = await User.countDocuments({
            createdAt: { $lt: monthAgo }
        });
        
        const growthPercentage = previousMonthUsers > 0 
            ? Math.round(((totalUsers - previousMonthUsers) / previousMonthUsers) * 100)
            : 100;

        res.status(200).json({
            success: true,
            stats: {
                total: totalUsers,
                students: totalStudents,
                organizations: totalOrganizations,
                active: activeUsers,
                blocked: blockedUsers,
                verified: verifiedUsers,
                unverified: unverifiedUsers,
                todayRegistrations,
                weekRegistrations,
                growthPercentage,
                averageDailyRegistrations: Math.round(weekRegistrations / 7)
            },
            percentages: {
                studentPercentage: Math.round((totalStudents / totalUsers) * 100),
                organizationPercentage: Math.round((totalOrganizations / totalUsers) * 100),
                activePercentage: Math.round((activeUsers / totalUsers) * 100),
                verifiedPercentage: Math.round((verifiedUsers / totalUsers) * 100)
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user statistics',
            error: error.message
        });
    }
};