const Post = require('../models/Post');
const Report = require('../models/Report');
const User = require('../models/User');

// ===== GET ALL POSTS =====
// GET /api/admin/content/posts
exports.getAllPosts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            type = '', // internship, update, announcement
            status = '', // active, removed, flagged
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching posts with filters:', { page, limit, search, type, status });

        // Build query
        let query = {};

        // Search by title or content
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get posts with pagination and populate user info
        const posts = await Post.find(query)
            .populate('userId', 'fullName username email userType')
            .populate('removedBy', 'fullName email')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await Post.countDocuments(query);

        // Format response
        const formattedPosts = posts.map(post => ({
            id: post._id,
            title: post.title,
            content: post.content.substring(0, 150) + (post.content.length > 150 ? '...' : ''),
            type: post.type,
            status: post.status,
            isReported: post.isReported,
            reportCount: post.reportCount,
            author: post.userId ? {
                id: post.userId._id,
                name: post.userId.fullName,
                username: post.userId.username,
                userType: post.userId.userType
            } : null,
            removedBy: post.removedBy ? {
                id: post.removedBy._id,
                name: post.removedBy.fullName
            } : null,
            removalReason: post.removalReason,
            views: post.views,
            likes: post.likes,
            comments: post.comments,
            createdAt: post.createdAt,
            removedAt: post.removedAt
        }));

        console.log(`✅ Found ${posts.length} posts`);

        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            posts: formattedPosts
        });

    } catch (error) {
        console.error('❌ Get all posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching posts',
            error: error.message
        });
    }
};

// ===== GET SINGLE POST =====
// GET /api/admin/content/posts/:id
exports.getPostById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching post ID: ${id}`);

        const post = await Post.findById(id)
            .populate('userId', 'fullName username email userType isActive')
            .populate('removedBy', 'fullName email');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Get reports for this post
        const reports = await Report.find({
            reportedId: id,
            reportedType: 'post'
        }).populate('reporterId', 'fullName username');

        console.log(`✅ Post found with ${reports.length} reports`);

        res.status(200).json({
            success: true,
            post: {
                id: post._id,
                title: post.title,
                content: post.content,
                type: post.type,
                status: post.status,
                isReported: post.isReported,
                reportCount: post.reportCount,
                author: post.userId ? {
                    id: post.userId._id,
                    name: post.userId.fullName,
                    username: post.userId.username,
                    email: post.userId.email,
                    userType: post.userId.userType,
                    isActive: post.userId.isActive
                } : null,
                removedBy: post.removedBy ? {
                    id: post.removedBy._id,
                    name: post.removedBy.fullName,
                    email: post.removedBy.email
                } : null,
                removalReason: post.removalReason,
                views: post.views,
                likes: post.likes,
                comments: post.comments,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                removedAt: post.removedAt
            },
            reports: reports.map(report => ({
                id: report._id,
                reason: report.reason,
                description: report.description,
                status: report.status,
                reporter: report.reporterId ? {
                    name: report.reporterId.fullName,
                    username: report.reporterId.username
                } : null,
                createdAt: report.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Get post by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching post',
            error: error.message
        });
    }
};

// ===== REMOVE POST =====
// DELETE /api/admin/content/posts/:id
exports.removePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        console.log(`🗑️ Removing post ID: ${id}`);
        console.log(`Reason: ${reason || 'No reason provided'}`);

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Update post status
        post.status = 'removed';
        post.removedBy = req.admin._id;
        post.removalReason = reason || 'Inappropriate content';
        post.removedAt = new Date();
        await post.save();

        // If there are reports, mark them as resolved
        await Report.updateMany(
            { reportedId: id, reportedType: 'post', status: 'pending' },
            { 
                status: 'resolved',
                actionTaken: 'content_removed',
                resolvedBy: req.admin._id,
                resolvedAt: new Date()
            }
        );

        console.log(`✅ Post removed by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Post removed successfully',
            post: {
                id: post._id,
                title: post.title,
                status: post.status,
                removedBy: req.admin.fullName,
                removalReason: post.removalReason,
                removedAt: post.removedAt
            }
        });

    } catch (error) {
        console.error('❌ Remove post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error removing post',
            error: error.message
        });
    }
};

// ===== GET ALL REPORTS =====
// GET /api/admin/content/reports
exports.getAllReports = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = '', // pending, under_review, resolved, dismissed
            type = '', // user, post, comment
            priority = '', // low, medium, high, urgent
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching reports with filters:', { page, limit, status, type, priority });

        // Build query
        let query = {};

        if (status) {
            query.status = status;
        }

        if (type) {
            query.reportedType = type;
        }

        if (priority) {
            query.priority = priority;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get reports with pagination
        const reports = await Report.find(query)
            .populate('reporterId', 'fullName username email')
            .populate('resolvedBy', 'fullName email')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await Report.countDocuments(query);

        // Format response
        const formattedReports = reports.map(report => ({
            id: report._id,
            reportedType: report.reportedType,
            reportedId: report.reportedId,
            reason: report.reason,
            description: report.description,
            status: report.status,
            priority: report.priority,
            actionTaken: report.actionTaken,
            reporter: report.reporterId ? {
                id: report.reporterId._id,
                name: report.reporterId.fullName,
                username: report.reporterId.username
            } : null,
            resolvedBy: report.resolvedBy ? {
                id: report.resolvedBy._id,
                name: report.resolvedBy.fullName
            } : null,
            createdAt: report.createdAt,
            resolvedAt: report.resolvedAt
        }));

        console.log(`✅ Found ${reports.length} reports`);

        res.status(200).json({
            success: true,
            count: reports.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            reports: formattedReports
        });

    } catch (error) {
        console.error('❌ Get all reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching reports',
            error: error.message
        });
    }
};

// ===== GET SINGLE REPORT =====
// GET /api/admin/content/reports/:id
exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching report ID: ${id}`);

        const report = await Report.findById(id)
            .populate('reporterId', 'fullName username email userType')
            .populate('resolvedBy', 'fullName email');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Get the reported item details
        let reportedItem = null;
        if (report.reportedType === 'post') {
            reportedItem = await Post.findById(report.reportedId)
                .populate('userId', 'fullName username');
        } else if (report.reportedType === 'user') {
            reportedItem = await User.findById(report.reportedId)
                .select('fullName username email userType isActive');
        }

        console.log(`✅ Report found`);

        res.status(200).json({
            success: true,
            report: {
                id: report._id,
                reportedType: report.reportedType,
                reportedId: report.reportedId,
                reason: report.reason,
                description: report.description,
                status: report.status,
                priority: report.priority,
                actionTaken: report.actionTaken,
                actionNote: report.actionNote,
                reporter: report.reporterId ? {
                    id: report.reporterId._id,
                    name: report.reporterId.fullName,
                    username: report.reporterId.username,
                    email: report.reporterId.email
                } : null,
                resolvedBy: report.resolvedBy ? {
                    id: report.resolvedBy._id,
                    name: report.resolvedBy.fullName,
                    email: report.resolvedBy.email
                } : null,
                createdAt: report.createdAt,
                resolvedAt: report.resolvedAt
            },
            reportedItem
        });

    } catch (error) {
        console.error('❌ Get report by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching report',
            error: error.message
        });
    }
};

// ===== RESOLVE REPORT =====
// PUT /api/admin/content/reports/:id/resolve
exports.resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, note } = req.body;

        console.log(`✅ Resolving report ID: ${id}`);
        console.log(`Action: ${action}, Note: ${note}`);

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Update report
        report.status = 'resolved';
        report.actionTaken = action || 'none';
        report.actionNote = note;
        report.resolvedBy = req.admin._id;
        report.resolvedAt = new Date();
        await report.save();

        console.log(`✅ Report resolved by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Report resolved successfully',
            report: {
                id: report._id,
                status: report.status,
                actionTaken: report.actionTaken,
                actionNote: report.actionNote,
                resolvedBy: req.admin.fullName,
                resolvedAt: report.resolvedAt
            }
        });

    } catch (error) {
        console.error('❌ Resolve report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resolving report',
            error: error.message
        });
    }
};

// ===== TAKE ACTION ON REPORT =====
// POST /api/admin/content/reports/:id/action
exports.takeReportAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, note } = req.body;

        if (!action || !['warning', 'content_removed', 'user_blocked', 'account_suspended'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action required: warning, content_removed, user_blocked, or account_suspended'
            });
        }

        console.log(`⚡ Taking action on report ID: ${id}`);
        console.log(`Action: ${action}`);

        const report = await Report.findById(id)
            .populate('reportedId');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        let actionResult = {};

        // Take appropriate action based on type
        switch (action) {
            case 'warning':
                // Just log the warning (in real app, send notification to user)
                actionResult.message = 'Warning issued to user';
                break;

            case 'content_removed':
                if (report.reportedType === 'post') {
                    await Post.findByIdAndUpdate(report.reportedId, {
                        status: 'removed',
                        removedBy: req.admin._id,
                        removalReason: note || 'Reported content',
                        removedAt: new Date()
                    });
                    actionResult.message = 'Content removed successfully';
                }
                break;

            case 'user_blocked':
                if (report.reportedType === 'user') {
                    const blockReason = note || 'Blocked due to reported content';
                    await User.findByIdAndUpdate(report.reportedId, {
                        $set: {
                            isBlocked: true,
                            blockReason,
                            blockedAt: new Date(),
                            blockedBy: req.admin._id
                        }
                    });
                    actionResult.message = 'User blocked successfully';
                } else if (report.reportedType === 'post') {
                    const post = await Post.findById(report.reportedId);
                    if (post) {
                        const blockReason = note || 'Blocked due to reported post content';
                        await User.findByIdAndUpdate(post.userId, {
                            $set: {
                                isBlocked: true,
                                blockReason,
                                blockedAt: new Date(),
                                blockedBy: req.admin._id
                            }
                        });
                        actionResult.message = 'Post author blocked successfully';
                    }
                }
                break;

            case 'account_suspended':
                if (report.reportedType === 'user') {
                    const blockReason = note || 'Account suspended due to violation';
                    await User.findByIdAndUpdate(report.reportedId, {
                        $set: {
                            isBlocked: true,
                            blockReason,
                            blockedAt: new Date(),
                            blockedBy: req.admin._id
                        }
                    });
                    actionResult.message = 'Account suspended successfully';
                }
                break;
        }

        // Update report
        report.status = 'resolved';
        report.actionTaken = action;
        report.actionNote = note;
        report.resolvedBy = req.admin._id;
        report.resolvedAt = new Date();
        await report.save();

        console.log(`✅ Action taken by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: actionResult.message || 'Action taken successfully',
            report: {
                id: report._id,
                status: report.status,
                actionTaken: report.actionTaken,
                actionNote: report.actionNote,
                resolvedBy: req.admin.fullName,
                resolvedAt: report.resolvedAt
            }
        });

    } catch (error) {
        console.error('❌ Take report action error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error taking action',
            error: error.message
        });
    }
};

// ===== GET CONTENT STATISTICS =====
// GET /api/admin/content/stats
exports.getContentStats = async (req, res) => {
    try {
        console.log('📊 Calculating content statistics...');

        // Post statistics
        const totalPosts = await Post.countDocuments();
        const activePosts = await Post.countDocuments({ status: 'active' });
        const removedPosts = await Post.countDocuments({ status: 'removed' });
        const reportedPosts = await Post.countDocuments({ isReported: true });

        // Report statistics
        const totalReports = await Report.countDocuments();
        const pendingReports = await Report.countDocuments({ status: 'pending' });
        const resolvedReports = await Report.countDocuments({ status: 'resolved' });
        const urgentReports = await Report.countDocuments({ priority: 'urgent', status: 'pending' });

        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPosts = await Post.countDocuments({ createdAt: { $gte: today } });
        const todayReports = await Report.countDocuments({ createdAt: { $gte: today } });

        console.log('✅ Statistics calculated successfully');

        res.status(200).json({
            success: true,
            stats: {
                posts: {
                    total: totalPosts,
                    active: activePosts,
                    removed: removedPosts,
                    reported: reportedPosts,
                    todayPosts
                },
                reports: {
                    total: totalReports,
                    pending: pendingReports,
                    resolved: resolvedReports,
                    urgent: urgentReports,
                    todayReports
                },
                percentages: {
                    activePostsRate: totalPosts > 0 ? Math.round((activePosts / totalPosts) * 100) : 0,
                    reportResolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Get content stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching content statistics',
            error: error.message
        });
    }
};
