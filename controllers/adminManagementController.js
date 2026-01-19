const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// ===== GET ALL ADMINS =====
// GET /api/admin/admins
exports.getAllAdmins = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '', // super_admin, admin, moderator
            status = '', // active, inactive
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching all admins...');

        // Build query
        let query = {};

        // Search by name or email
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by role
        if (role) {
            query.role = role;
        }

        // Filter by status
        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get admins with pagination
        const admins = await Admin.find(query)
            .select('-password')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await Admin.countDocuments(query);

        // Format response
        const formattedAdmins = admins.map(admin => ({
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
            permissions: admin.permissions,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt
        }));

        console.log(`✅ Found ${admins.length} admins`);

        res.status(200).json({
            success: true,
            count: admins.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            admins: formattedAdmins
        });

    } catch (error) {
        console.error('❌ Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching admins',
            error: error.message
        });
    }
};

// ===== GET SINGLE ADMIN =====
// GET /api/admin/admins/:id
exports.getAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching admin ID: ${id}`);

        const admin = await Admin.findById(id).select('-password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        console.log(`✅ Admin found: ${admin.fullName}`);

        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                isActive: admin.isActive,
                permissions: admin.permissions,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Get admin by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching admin',
            error: error.message
        });
    }
};

// ===== CREATE ADMIN =====
// POST /api/admin/admins
exports.createAdmin = async (req, res) => {
    try {
        const { fullName, email, password, role, permissions } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Full name, email, and password are required'
            });
        }

        console.log('📝 Creating new admin:', email);

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const admin = await Admin.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || 'admin',
            permissions: permissions || {
                manageUsers: true,
                manageOrgs: true,
                manageContent: true,
                manageSkills: false,
                sendAnnouncements: false,
                viewAnalytics: true
            }
        });

        console.log(`✅ Admin created by super admin: ${req.admin.email}`);

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                createdAt: admin.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating admin',
            error: error.message
        });
    }
};

// ===== UPDATE ADMIN =====
// PUT /api/admin/admins/:id
exports.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, role, isActive } = req.body;

        console.log(`✏️ Updating admin ID: ${id}`);

        const admin = await Admin.findById(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent super admin from being modified by non-super admins
        if (admin.role === 'super_admin' && req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super admins can modify other super admins'
            });
        }

        // Prevent admin from deactivating themselves
        if (id === req.admin._id.toString() && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Update fields
        if (fullName) admin.fullName = fullName;
        if (email) admin.email = email.toLowerCase();
        if (role) admin.role = role;
        if (isActive !== undefined) admin.isActive = isActive;

        await admin.save();

        console.log(`✅ Admin updated by super admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                isActive: admin.isActive,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        console.error('❌ Update admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating admin',
            error: error.message
        });
    }
};

// ===== UPDATE ADMIN PERMISSIONS =====
// PUT /api/admin/admins/:id/permissions
exports.updateAdminPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Permissions object is required'
            });
        }

        console.log(`🔐 Updating permissions for admin ID: ${id}`);

        const admin = await Admin.findById(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent modifying super admin permissions
        if (admin.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify super admin permissions'
            });
        }

        // Update permissions
        admin.permissions = {
            ...admin.permissions,
            ...permissions
        };

        await admin.save();

        console.log(`✅ Admin permissions updated by super admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Admin permissions updated successfully',
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        console.error('❌ Update admin permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating permissions',
            error: error.message
        });
    }
};

// ===== DELETE ADMIN =====
// DELETE /api/admin/admins/:id
exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ Deleting admin ID: ${id}`);

        // Prevent admin from deleting themselves
        if (id === req.admin._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const admin = await Admin.findById(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent deleting super admin
        if (admin.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete super admin account'
            });
        }

        await Admin.findByIdAndDelete(id);

        console.log(`✅ Admin deleted by super admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Admin deleted successfully',
            deletedAdmin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('❌ Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting admin',
            error: error.message
        });
    }
};

// ===== GET ADMIN STATISTICS =====
// GET /api/admin/admins/stats
exports.getAdminStats = async (req, res) => {
    try {
        console.log('📊 Calculating admin statistics...');

        // Get counts by role
        const totalAdmins = await Admin.countDocuments();
        const superAdmins = await Admin.countDocuments({ role: 'super_admin' });
        const regularAdmins = await Admin.countDocuments({ role: 'admin' });
        const moderators = await Admin.countDocuments({ role: 'moderator' });

        // Get active/inactive counts
        const activeAdmins = await Admin.countDocuments({ isActive: true });
        const inactiveAdmins = await Admin.countDocuments({ isActive: false });

        // Get recently created admins
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const recentAdmins = await Admin.countDocuments({ createdAt: { $gte: weekAgo } });

        // Get admins with recent activity
        const recentlyActive = await Admin.countDocuments({ 
            lastLogin: { $gte: weekAgo } 
        });

        console.log('✅ Statistics calculated successfully');

        res.status(200).json({
            success: true,
            stats: {
                total: totalAdmins,
                byRole: {
                    superAdmins,
                    admins: regularAdmins,
                    moderators
                },
                byStatus: {
                    active: activeAdmins,
                    inactive: inactiveAdmins
                },
                recent: {
                    newAdmins: recentAdmins,
                    recentlyActive
                },
                percentages: {
                    activeRate: totalAdmins > 0 ? Math.round((activeAdmins / totalAdmins) * 100) : 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Get admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching admin statistics',
            error: error.message
        });
    }
};
