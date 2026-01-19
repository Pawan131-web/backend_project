const Notification = require('../models/Notification');
const User = require('../models/User');

// Get user's notifications
exports.getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { unreadOnly = false } = req.query;

        let query = { userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching notifications'
        });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        await Notification.findByIdAndUpdate(notificationId, { isRead: true });

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        await Notification.updateMany({ userId, isRead: false }, { isRead: true });

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Check verification status (for org to refresh their status)
exports.checkVerificationStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

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
                isVerified: user.isVerified,
                isActive: user.isActive,
                isBlocked: user.isBlocked || false,
                blockReason: user.blockReason,
                orgVerificationStatus: user.orgVerificationStatus,
                orgVerifiedAt: user.orgVerifiedAt,
                orgRejectionReason: user.orgRejectionReason
            }
        });

    } catch (error) {
        console.error('Check verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Create notification (internal use)
exports.createNotification = async (userId, type, title, message, data = {}) => {
    try {
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data
        });
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};
