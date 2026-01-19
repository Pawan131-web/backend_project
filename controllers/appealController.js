// controllers/appealController.js
const Appeal = require('../models/Appeal');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ===== CREATE APPEAL =====
exports.createAppeal = async (req, res) => {
    try {
        const { userId, type, subject, message } = req.body;

        if (!userId || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId, subject, and message'
            });
        }

        const appeal = await Appeal.create({
            userId,
            type: type || 'block_appeal',
            subject,
            message
        });

        console.log(`📨 New appeal created by user: ${userId}`);

        res.status(201).json({
            success: true,
            message: 'Appeal submitted successfully. Admin will review your request.',
            appeal: {
                id: appeal._id,
                subject: appeal.subject,
                status: appeal.status,
                createdAt: appeal.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create appeal error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating appeal',
            error: error.message
        });
    }
};

// ===== GET USER'S APPEALS =====
exports.getUserAppeals = async (req, res) => {
    try {
        const { userId } = req.params;

        const appeals = await Appeal.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: appeals.length,
            appeals
        });

    } catch (error) {
        console.error('❌ Get user appeals error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching appeals',
            error: error.message
        });
    }
};

// ===== GET ALL APPEALS (Admin) =====
exports.getAllAppeals = async (req, res) => {
    try {
        const { status = '', page = 1, limit = 20 } = req.query;

        let query = {};
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const appeals = await Appeal.find(query)
            .populate('userId', 'fullName username email userType isBlocked')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Appeal.countDocuments(query);

        res.status(200).json({
            success: true,
            count: appeals.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            appeals: appeals.map(a => ({
                id: a._id,
                user: a.userId ? {
                    id: a.userId._id,
                    fullName: a.userId.fullName,
                    username: a.userId.username,
                    email: a.userId.email,
                    userType: a.userId.userType,
                    isBlocked: a.userId.isBlocked
                } : null,
                type: a.type,
                subject: a.subject,
                message: a.message,
                status: a.status,
                adminResponse: a.adminResponse,
                createdAt: a.createdAt,
                reviewedAt: a.reviewedAt
            }))
        });

    } catch (error) {
        console.error('❌ Get all appeals error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching appeals',
            error: error.message
        });
    }
};

// ===== RESPOND TO APPEAL (Admin) =====
exports.respondToAppeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminResponse, adminId, unblockUser } = req.body;

        const appeal = await Appeal.findById(id);
        if (!appeal) {
            return res.status(404).json({
                success: false,
                message: 'Appeal not found'
            });
        }

        appeal.status = status || 'reviewed';
        appeal.adminResponse = adminResponse;
        appeal.reviewedBy = adminId;
        appeal.reviewedAt = new Date();
        await appeal.save();

        // If admin decides to unblock the user
        if (unblockUser && appeal.userId) {
            const user = await User.findByIdAndUpdate(
                appeal.userId,
                {
                    $set: { isBlocked: false },
                    $unset: { blockReason: 1, blockedAt: 1, blockedBy: 1 }
                },
                { new: true }
            );
            if (user) {
                // Notify user they've been unblocked
                await Notification.create({
                    userId: user._id,
                    type: 'account_unblocked',
                    title: 'Appeal Approved - Account Unblocked',
                    message: adminResponse || 'Your appeal has been approved. Your account is now unblocked.',
                    isRead: false
                });
            }
        } else {
            // Notify user of appeal response
            await Notification.create({
                userId: appeal.userId,
                type: 'appeal_response',
                title: `Appeal ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Reviewed'}`,
                message: adminResponse || 'Your appeal has been reviewed by admin.',
                isRead: false
            });
        }

        console.log(`✅ Appeal ${id} responded to by admin`);

        res.status(200).json({
            success: true,
            message: 'Appeal response saved successfully',
            appeal: {
                id: appeal._id,
                status: appeal.status,
                adminResponse: appeal.adminResponse
            }
        });

    } catch (error) {
        console.error('❌ Respond to appeal error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error responding to appeal',
            error: error.message
        });
    }
};
