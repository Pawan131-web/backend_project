const Announcement = require('../models/Announcement');
const User = require('../models/User');

// ===== GET ALL ANNOUNCEMENTS =====
// GET /api/admin/announcements
exports.getAllAnnouncements = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = '', // draft, scheduled, sent, archived
            type = '', // info, warning, success, error, maintenance
            target = '', // all, students, organizations
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching announcements with filters:', { page, limit, status, type, target });

        // Build query
        let query = {};

        if (status) {
            query.status = status;
        }

        if (type) {
            query.type = type;
        }

        if (target) {
            query.target = target;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get announcements with pagination
        const announcements = await Announcement.find(query)
            .populate('createdBy', 'fullName email')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await Announcement.countDocuments(query);

        // Format response
        const formattedAnnouncements = announcements.map(announcement => ({
            id: announcement._id,
            title: announcement.title,
            message: announcement.message.substring(0, 100) + (announcement.message.length > 100 ? '...' : ''),
            type: announcement.type,
            target: announcement.target,
            priority: announcement.priority,
            status: announcement.status,
            isSent: announcement.isSent,
            recipientsCount: announcement.recipientsCount,
            createdBy: announcement.createdBy ? {
                id: announcement.createdBy._id,
                name: announcement.createdBy.fullName,
                email: announcement.createdBy.email
            } : null,
            sentAt: announcement.sentAt,
            scheduledFor: announcement.scheduledFor,
            createdAt: announcement.createdAt
        }));

        console.log(`✅ Found ${announcements.length} announcements`);

        res.status(200).json({
            success: true,
            count: announcements.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            announcements: formattedAnnouncements
        });

    } catch (error) {
        console.error('❌ Get all announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching announcements',
            error: error.message
        });
    }
};

// ===== GET SINGLE ANNOUNCEMENT =====
// GET /api/admin/announcements/:id
exports.getAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching announcement ID: ${id}`);

        const announcement = await Announcement.findById(id)
            .populate('createdBy', 'fullName email role');

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        console.log(`✅ Announcement found: ${announcement.title}`);

        res.status(200).json({
            success: true,
            announcement: {
                id: announcement._id,
                title: announcement.title,
                message: announcement.message,
                type: announcement.type,
                target: announcement.target,
                priority: announcement.priority,
                status: announcement.status,
                isSent: announcement.isSent,
                recipientsCount: announcement.recipientsCount,
                createdBy: announcement.createdBy ? {
                    id: announcement.createdBy._id,
                    name: announcement.createdBy.fullName,
                    email: announcement.createdBy.email,
                    role: announcement.createdBy.role
                } : null,
                sentAt: announcement.sentAt,
                scheduledFor: announcement.scheduledFor,
                createdAt: announcement.createdAt,
                updatedAt: announcement.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Get announcement by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching announcement',
            error: error.message
        });
    }
};

// ===== CREATE ANNOUNCEMENT =====
// POST /api/admin/announcements
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, message, type, target, priority, scheduledFor } = req.body;

        // Validation
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required'
            });
        }

        console.log('📝 Creating new announcement:', title);

        // Create announcement
        const announcement = await Announcement.create({
            title,
            message,
            type: type || 'info',
            target: target || 'all',
            priority: priority || 'medium',
            scheduledFor: scheduledFor || null,
            status: scheduledFor ? 'scheduled' : 'draft',
            createdBy: req.admin._id
        });

        // Populate creator info
        await announcement.populate('createdBy', 'fullName email');

        console.log(`✅ Announcement created by admin: ${req.admin.email}`);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            announcement: {
                id: announcement._id,
                title: announcement.title,
                message: announcement.message,
                type: announcement.type,
                target: announcement.target,
                priority: announcement.priority,
                status: announcement.status,
                scheduledFor: announcement.scheduledFor,
                createdBy: {
                    id: announcement.createdBy._id,
                    name: announcement.createdBy.fullName,
                    email: announcement.createdBy.email
                },
                createdAt: announcement.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating announcement',
            error: error.message
        });
    }
};

// ===== UPDATE ANNOUNCEMENT =====
// PUT /api/admin/announcements/:id
exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, type, target, priority, scheduledFor, status } = req.body;

        console.log(`✏️ Updating announcement ID: ${id}`);

        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check if announcement is already sent
        if (announcement.isSent) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update an announcement that has already been sent'
            });
        }

        // Update fields
        if (title) announcement.title = title;
        if (message) announcement.message = message;
        if (type) announcement.type = type;
        if (target) announcement.target = target;
        if (priority) announcement.priority = priority;
        if (scheduledFor !== undefined) announcement.scheduledFor = scheduledFor;
        if (status) announcement.status = status;

        await announcement.save();
        await announcement.populate('createdBy', 'fullName email');

        console.log(`✅ Announcement updated by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Announcement updated successfully',
            announcement: {
                id: announcement._id,
                title: announcement.title,
                message: announcement.message,
                type: announcement.type,
                target: announcement.target,
                priority: announcement.priority,
                status: announcement.status,
                scheduledFor: announcement.scheduledFor,
                updatedAt: announcement.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating announcement',
            error: error.message
        });
    }
};

// ===== DELETE ANNOUNCEMENT =====
// DELETE /api/admin/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ Deleting announcement ID: ${id}`);

        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check if announcement is already sent
        if (announcement.isSent) {
            // Archive instead of delete
            announcement.status = 'archived';
            await announcement.save();

            console.log(`📦 Announcement archived instead of deleted (was already sent)`);

            return res.status(200).json({
                success: true,
                message: 'Announcement archived (cannot delete sent announcements)',
                announcement: {
                    id: announcement._id,
                    status: announcement.status
                }
            });
        }

        // Delete the announcement
        await Announcement.findByIdAndDelete(id);

        console.log(`✅ Announcement deleted by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Announcement deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting announcement',
            error: error.message
        });
    }
};

// ===== SEND ANNOUNCEMENT =====
// POST /api/admin/announcements/:id/send
exports.sendAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📤 Sending announcement ID: ${id}`);

        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check if already sent
        if (announcement.isSent) {
            return res.status(400).json({
                success: false,
                message: 'Announcement has already been sent'
            });
        }

        // Build query based on target
        let userQuery = {};
        
        switch (announcement.target) {
            case 'students':
                userQuery.userType = 'student';
                break;
            case 'organizations':
                userQuery.userType = 'organization';
                break;
            case 'verified_users':
                userQuery.isVerified = true;
                break;
            case 'unverified_users':
                userQuery.isVerified = false;
                break;
            case 'all':
            default:
                // No filter, send to all
                break;
        }

        // Get recipients count
        const recipientsCount = await User.countDocuments(userQuery);

        // In a real application, you would:
        // 1. Get all matching users
        // 2. Send email/notification to each user
        // 3. Use a queue system for large batches
        
        // For now, we'll just mark it as sent
        announcement.isSent = true;
        announcement.sentAt = new Date();
        announcement.status = 'sent';
        announcement.recipientsCount = recipientsCount;
        await announcement.save();

        console.log(`✅ Announcement sent to ${recipientsCount} users by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: `Announcement sent successfully to ${recipientsCount} users`,
            announcement: {
                id: announcement._id,
                title: announcement.title,
                isSent: announcement.isSent,
                sentAt: announcement.sentAt,
                recipientsCount: announcement.recipientsCount,
                target: announcement.target
            }
        });

    } catch (error) {
        console.error('❌ Send announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error sending announcement',
            error: error.message
        });
    }
};

// ===== GET ANNOUNCEMENT STATISTICS =====
// GET /api/admin/announcements/stats
exports.getAnnouncementStats = async (req, res) => {
    try {
        console.log('📊 Calculating announcement statistics...');

        // Get counts by status
        const totalAnnouncements = await Announcement.countDocuments();
        const draftAnnouncements = await Announcement.countDocuments({ status: 'draft' });
        const scheduledAnnouncements = await Announcement.countDocuments({ status: 'scheduled' });
        const sentAnnouncements = await Announcement.countDocuments({ status: 'sent' });
        const archivedAnnouncements = await Announcement.countDocuments({ status: 'archived' });

        // Get counts by type
        const infoAnnouncements = await Announcement.countDocuments({ type: 'info' });
        const warningAnnouncements = await Announcement.countDocuments({ type: 'warning' });
        const successAnnouncements = await Announcement.countDocuments({ type: 'success' });

        // Get recent announcements
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAnnouncements = await Announcement.countDocuments({ createdAt: { $gte: today } });
        const todaySent = await Announcement.countDocuments({ sentAt: { $gte: today } });

        // Get total recipients reached
        const totalRecipientsReached = await Announcement.aggregate([
            { $match: { isSent: true } },
            { $group: { _id: null, total: { $sum: '$recipientsCount' } } }
        ]);

        const recipientsReached = totalRecipientsReached.length > 0 ? totalRecipientsReached[0].total : 0;

        console.log('✅ Statistics calculated successfully');

        res.status(200).json({
            success: true,
            stats: {
                total: totalAnnouncements,
                byStatus: {
                    draft: draftAnnouncements,
                    scheduled: scheduledAnnouncements,
                    sent: sentAnnouncements,
                    archived: archivedAnnouncements
                },
                byType: {
                    info: infoAnnouncements,
                    warning: warningAnnouncements,
                    success: successAnnouncements
                },
                today: {
                    created: todayAnnouncements,
                    sent: todaySent
                },
                totalRecipientsReached: recipientsReached
            }
        });

    } catch (error) {
        console.error('❌ Get announcement stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching announcement statistics',
            error: error.message
        });
    }
};
