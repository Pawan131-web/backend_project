const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const ActivityLog = require('../models/ActivityLog');
const Admin = require('../models/Admin');

// ===== GET PLATFORM OVERVIEW =====
// GET /api/admin/analytics/overview
exports.getPlatformOverview = async (req, res) => {
    try {
        console.log('📊 Fetching platform overview...');

        // User statistics
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ userType: 'student' });
        const totalOrganizations = await User.countDocuments({ userType: 'organization' });
        const activeUsers = await User.countDocuments({ isActive: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });

        // Organization statistics
        const verifiedOrgs = await User.countDocuments({ 
            userType: 'organization', 
            isVerified: true 
        });
        const pendingOrgs = await User.countDocuments({ 
            userType: 'organization', 
            isVerified: false,
            isActive: true
        });

        // Content statistics
        const totalPosts = await Post.countDocuments();
        const activePosts = await Post.countDocuments({ status: 'active' });
        const reportedPosts = await Post.countDocuments({ isReported: true });

        // Report statistics
        const totalReports = await Report.countDocuments();
        const pendingReports = await Report.countDocuments({ status: 'pending' });
        const resolvedReports = await Report.countDocuments({ status: 'resolved' });

        // Today's activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsers = await User.countDocuments({ createdAt: { $gte: today } });
        const todayPosts = await Post.countDocuments({ createdAt: { $gte: today } });
        const todayReports = await Report.countDocuments({ createdAt: { $gte: today } });

        // Admin statistics
        const totalAdmins = await Admin.countDocuments();
        const activeAdmins = await Admin.countDocuments({ isActive: true });

        console.log('✅ Platform overview fetched successfully');

        res.status(200).json({
            success: true,
            overview: {
                users: {
                    total: totalUsers,
                    students: totalStudents,
                    organizations: totalOrganizations,
                    active: activeUsers,
                    verified: verifiedUsers,
                    todayRegistrations: todayUsers
                },
                organizations: {
                    total: totalOrganizations,
                    verified: verifiedOrgs,
                    pending: pendingOrgs
                },
                content: {
                    totalPosts,
                    activePosts,
                    reportedPosts,
                    todayPosts
                },
                reports: {
                    total: totalReports,
                    pending: pendingReports,
                    resolved: resolvedReports,
                    todayReports
                },
                admins: {
                    total: totalAdmins,
                    active: activeAdmins
                },
                percentages: {
                    activeUsersRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
                    verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
                    orgVerificationRate: totalOrganizations > 0 ? Math.round((verifiedOrgs / totalOrganizations) * 100) : 0,
                    reportResolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Get platform overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching platform overview',
            error: error.message
        });
    }
};

// ===== GET USER GROWTH DATA =====
// GET /api/admin/analytics/growth
exports.getUserGrowth = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysNum = parseInt(days);

        console.log(`📈 Fetching user growth data for last ${daysNum} days...`);

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        // Get daily user registrations
        const dailyRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    students: {
                        $sum: { $cond: [{ $eq: ['$userType', 'student'] }, 1, 0] }
                    },
                    organizations: {
                        $sum: { $cond: [{ $eq: ['$userType', 'organization'] }, 1, 0] }
                    },
                    total: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Format the data
        const growthData = dailyRegistrations.map(item => ({
            date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
            students: item.students,
            organizations: item.organizations,
            total: item.total
        }));

        // Calculate totals
        const totalNewUsers = growthData.reduce((sum, day) => sum + day.total, 0);
        const totalNewStudents = growthData.reduce((sum, day) => sum + day.students, 0);
        const totalNewOrgs = growthData.reduce((sum, day) => sum + day.organizations, 0);

        // Calculate average daily growth
        const avgDailyGrowth = daysNum > 0 ? Math.round(totalNewUsers / daysNum) : 0;

        // Get previous period for comparison
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysNum);
        
        const prevPeriodUsers = await User.countDocuments({
            createdAt: { $gte: prevStartDate, $lt: startDate }
        });

        const growthPercentage = prevPeriodUsers > 0 
            ? Math.round(((totalNewUsers - prevPeriodUsers) / prevPeriodUsers) * 100)
            : 100;

        console.log('✅ User growth data fetched successfully');

        res.status(200).json({
            success: true,
            period: {
                days: daysNum,
                startDate,
                endDate
            },
            summary: {
                totalNewUsers,
                totalNewStudents,
                totalNewOrganizations: totalNewOrgs,
                avgDailyGrowth,
                growthPercentage
            },
            data: growthData
        });

    } catch (error) {
        console.error('❌ Get user growth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user growth data',
            error: error.message
        });
    }
};

// ===== GET ENGAGEMENT METRICS =====
// GET /api/admin/analytics/engagement
exports.getEngagementMetrics = async (req, res) => {
    try {
        console.log('📊 Fetching engagement metrics...');

        // Time periods
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);

        // Post engagement
        const totalPosts = await Post.countDocuments();
        const postsThisWeek = await Post.countDocuments({ createdAt: { $gte: weekAgo } });
        const postsThisMonth = await Post.countDocuments({ createdAt: { $gte: monthAgo } });

        // Get post engagement stats
        const postStats = await Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$likes' },
                    totalComments: { $sum: '$comments' },
                    avgViews: { $avg: '$views' },
                    avgLikes: { $avg: '$likes' },
                    avgComments: { $avg: '$comments' }
                }
            }
        ]);

        const engagement = postStats.length > 0 ? postStats[0] : {
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            avgViews: 0,
            avgLikes: 0,
            avgComments: 0
        };

        // Report activity
        const reportsThisWeek = await Report.countDocuments({ createdAt: { $gte: weekAgo } });
        const reportsThisMonth = await Report.countDocuments({ createdAt: { $gte: monthAgo } });
        const resolvedThisWeek = await Report.countDocuments({ 
            resolvedAt: { $gte: weekAgo },
            status: 'resolved'
        });

        // Admin activity
        const adminActionsToday = await ActivityLog.countDocuments({ timestamp: { $gte: today } });
        const adminActionsThisWeek = await ActivityLog.countDocuments({ timestamp: { $gte: weekAgo } });
        const adminActionsThisMonth = await ActivityLog.countDocuments({ timestamp: { $gte: monthAgo } });

        // Most active admins this week
        const activeAdmins = await ActivityLog.aggregate([
            {
                $match: { timestamp: { $gte: weekAgo } }
            },
            {
                $group: {
                    _id: '$adminId',
                    actionCount: { $sum: 1 }
                }
            },
            {
                $sort: { actionCount: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: 'admins',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'admin'
                }
            },
            {
                $unwind: '$admin'
            }
        ]);

        const topAdmins = activeAdmins.map(item => ({
            id: item._id,
            name: item.admin.fullName,
            email: item.admin.email,
            actionCount: item.actionCount
        }));

        // User activity by type
        const userTypeActivity = await Post.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $group: {
                    _id: '$user.userType',
                    postCount: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$likes' }
                }
            }
        ]);

        console.log('✅ Engagement metrics fetched successfully');

        res.status(200).json({
            success: true,
            engagement: {
                posts: {
                    total: totalPosts,
                    thisWeek: postsThisWeek,
                    thisMonth: postsThisMonth,
                    totalViews: engagement.totalViews,
                    totalLikes: engagement.totalLikes,
                    totalComments: engagement.totalComments,
                    avgViews: Math.round(engagement.avgViews),
                    avgLikes: Math.round(engagement.avgLikes),
                    avgComments: Math.round(engagement.avgComments)
                },
                reports: {
                    thisWeek: reportsThisWeek,
                    thisMonth: reportsThisMonth,
                    resolvedThisWeek
                },
                adminActivity: {
                    today: adminActionsToday,
                    thisWeek: adminActionsThisWeek,
                    thisMonth: adminActionsThisMonth,
                    topAdmins
                },
                userTypeActivity
            }
        });

    } catch (error) {
        console.error('❌ Get engagement metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching engagement metrics',
            error: error.message
        });
    }
};

// ===== GET ACTIVITY LOGS =====
// GET /api/admin/analytics/activity-logs
exports.getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action = '',
            adminId = '',
            targetType = '',
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching activity logs...');

        // Build query
        let query = {};

        if (action) {
            query.action = action;
        }

        if (adminId) {
            query.adminId = adminId;
        }

        if (targetType) {
            query.targetType = targetType;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get activity logs
        const logs = await ActivityLog.find(query)
            .populate('adminId', 'fullName email role')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await ActivityLog.countDocuments(query);

        // Format response
        const formattedLogs = logs.map(log => ({
            id: log._id,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            details: log.details,
            admin: log.adminId ? {
                id: log.adminId._id,
                name: log.adminId.fullName,
                email: log.adminId.email,
                role: log.adminId.role
            } : null,
            status: log.status,
            ipAddress: log.ipAddress,
            timestamp: log.timestamp
        }));

        console.log(`✅ Found ${logs.length} activity logs`);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            logs: formattedLogs
        });

    } catch (error) {
        console.error('❌ Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching activity logs',
            error: error.message
        });
    }
};

// ===== LOG ADMIN ACTION (Helper function) =====
exports.logAdminAction = async (adminId, action, targetType, targetId, details, req) => {
    try {
        await ActivityLog.create({
            adminId,
            action,
            targetType,
            targetId,
            details,
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.headers?.['user-agent'],
            status: 'success'
        });
    } catch (error) {
        console.error('❌ Error logging admin action:', error);
    }
};
