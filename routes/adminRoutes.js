const express = require('express');
const router = express.Router();
const User = require('../models/User');
const adminOrgController = require('../controllers/adminOrgController');

// ===== GET PENDING ORGANIZATIONS =====
// GET /api/admin/pending-organizations
router.get('/pending-organizations', async (req, res) => {
    try {
        console.log('🔍 Fetching pending organizations...');
        
        // Find organizations that are not verified
        const pendingOrgs = await User.find({
            userType: 'organization',
            isVerified: false,
            isActive: true
        })
        .select('fullName username email createdAt verificationCode')
        .sort({ createdAt: -1 });
        
        console.log(`📊 Found ${pendingOrgs.length} pending organizations`);
        
        res.json({
            success: true,
            count: pendingOrgs.length,
            organizations: pendingOrgs.map(org => ({
                id: org._id,
                fullName: org.fullName,
                username: org.username,
                email: org.email,
                createdAt: org.createdAt,
                daysAgo: Math.floor((new Date() - new Date(org.createdAt)) / (1000 * 60 * 60 * 24))
            }))
        });
        
    } catch (error) {
        console.error('❌ Error fetching pending organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organizations',
            error: error.message
        });
    }
});

// ===== VERIFY ORGANIZATION =====
// PUT /api/admin/verify-organization/:id
router.put('/verify-organization/:id', async (req, res) => {
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
        
        // Mark as verified
        organization.isVerified = true;
        organization.verificationCode = undefined; // Clear verification code
        organization.codeExpires = undefined;
        
        await organization.save();
        
        console.log(`🎉 Organization verified: ${organization.fullName} (${organization.username})`);
        
        res.json({
            success: true,
            message: 'Organization verified successfully!',
            organization: {
                id: organization._id,
                fullName: organization.fullName,
                username: organization.username,
                email: organization.email,
                isVerified: organization.isVerified,
                verifiedAt: new Date()
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
});

// ===== REJECT/REMOVE ORGANIZATION =====
// DELETE /api/admin/reject-organization/:id
router.delete('/reject-organization/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        console.log(`❌ Rejecting organization ID: ${id}, Reason: ${reason}`);
        
        const organization = await User.findById(id);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }
        
        // Option 1: Deactivate the account
        // organization.isActive = false;
        // organization.rejectionReason = reason;
        // await organization.save();
        
        // Option 2: Delete the account (more permanent)
        await User.findByIdAndDelete(id);
        
        console.log(`🗑️ Organization rejected/deleted: ${organization.fullName}`);
        
        res.json({
            success: true,
            message: 'Organization rejected and removed successfully',
            deletedOrganization: {
                id: organization._id,
                fullName: organization.fullName,
                email: organization.email
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
});

// ===== GET ALL ORGANIZATIONS (verified & unverified) =====
// GET /api/admin/all-organizations
router.get('/all-organizations', async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        let query = { userType: 'organization' };
        
        // Filter by verification status
        if (status === 'verified') {
            query.isVerified = true;
        } else if (status === 'pending') {
            query.isVerified = false;
        }
        
        const skip = (page - 1) * limit;
        
        const organizations = await User.find(query)
            .select('fullName username email isVerified isActive createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            count: organizations.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            organizations: organizations.map(org => ({
                id: org._id,
                fullName: org.fullName,
                username: org.username,
                email: org.email,
                isVerified: org.isVerified,
                isActive: org.isActive,
                createdAt: org.createdAt,
                status: org.isVerified ? 'verified' : 'pending'
            }))
        });
        
    } catch (error) {
        console.error('❌ Error fetching organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organizations',
            error: error.message
        });
    }
});

// ===== GET ALL USERS (with filters) =====
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10, userType, status, search } = req.query;
        
        let query = {};
        
        // Filter by user type
        if (userType && userType !== '') {
            query.userType = userType;
        }
        
        // Filter by status
        if (status === 'active') {
            query.isBlocked = { $ne: true };
            query.isActive = true;
        } else if (status === 'blocked') {
            query.isBlocked = true;
        } else if (status === 'verified') {
            query.isVerified = true;
        } else if (status === 'unverified') {
            query.isVerified = false;
        }
        
        // Search by name, email, or username
        if (search && search.trim() !== '') {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const users = await User.find(query)
            .select('fullName username email userType isVerified isActive isBlocked blockReason createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            users: users.map(u => ({
                id: u._id,
                fullName: u.fullName,
                username: u.username,
                email: u.email,
                userType: u.userType,
                isVerified: u.isVerified,
                isActive: u.isBlocked ? false : u.isActive,
                isBlocked: u.isBlocked || false,
                blockReason: u.blockReason,
                createdAt: u.createdAt
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Server error fetching users' });
    }
});

// ===== GET SINGLE USER =====
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('fullName username email userType isVerified isActive isBlocked blockReason blockedAt createdAt');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isVerified: user.isVerified,
                isActive: user.isBlocked ? false : user.isActive,
                isBlocked: user.isBlocked || false,
                blockReason: user.blockReason,
                blockedAt: user.blockedAt,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== BLOCK USER =====
router.put('/users/:id/block', adminOrgController.blockUser);

// ===== UNBLOCK USER =====
router.put('/users/:id/unblock', adminOrgController.unblockUser);

// ===== GET ALL STUDENTS =====
router.get('/students', adminOrgController.getAllStudents);

// ===== SEARCH ALL USERS =====
router.get('/users/search', adminOrgController.searchAllUsers);

// ===== GET ALL ORGANIZATIONS =====
router.get('/organizations', async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        let query = { userType: 'organization' };
        
        if (status === 'verified') query.isVerified = true;
        else if (status === 'pending') query.isVerified = false;
        else if (status === 'blocked') query.isBlocked = true;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orgs = await User.find(query)
            .select('fullName username email isVerified isActive isBlocked orgVerificationStatus createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            organizations: orgs.map(o => ({
                id: o._id,
                fullName: o.fullName,
                username: o.username,
                email: o.email,
                isVerified: o.isVerified,
                isActive: o.isBlocked ? false : o.isActive,
                isBlocked: o.isBlocked || false,
                orgVerificationStatus: o.orgVerificationStatus,
                createdAt: o.createdAt
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== SEND ANNOUNCEMENT =====
router.post('/send-announcement', async (req, res) => {
    try {
        const { title, message, target } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        
        let userQuery = { isBlocked: { $ne: true } };
        if (target === 'students') {
            userQuery.userType = 'student';
        } else if (target === 'organizations') {
            userQuery.userType = 'organization';
        }
        
        const Notification = require('../models/Notification');
        const users = await User.find(userQuery).select('_id');
        
        const notifications = users.map(user => ({
            userId: user._id,
            type: 'announcement',
            title: title,
            message: message,
            isRead: false
        }));
        
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
        
        res.json({
            success: true,
            message: 'Announcement sent successfully',
            count: notifications.length
        });
    } catch (error) {
        console.error('Send announcement error:', error);
        res.status(500).json({ success: false, message: 'Server error sending announcement' });
    }
});

module.exports = router;