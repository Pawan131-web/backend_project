const express = require('express');
const router = express.Router();
const User = require('../models/User');

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

module.exports = router;