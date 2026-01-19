const Setting = require('../models/Setting');
const mongoose = require('mongoose');

// ===== GET ALL SETTINGS =====
// GET /api/admin/settings
exports.getAllSettings = async (req, res) => {
    try {
        const { category = '', isPublic = '' } = req.query;

        console.log('📋 Fetching all settings...');

        // Build query
        let query = {};

        if (category) {
            query.category = category;
        }

        if (isPublic !== '') {
            query.isPublic = isPublic === 'true';
        }

        // Get all settings
        const settings = await Setting.find(query)
            .populate('updatedBy', 'fullName email')
            .sort({ category: 1, key: 1 });

        // Group settings by category
        const groupedSettings = settings.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = [];
            }
            acc[setting.category].push({
                id: setting._id,
                key: setting.key,
                value: setting.value,
                type: setting.type,
                description: setting.description,
                isPublic: setting.isPublic,
                isEditable: setting.isEditable,
                defaultValue: setting.defaultValue,
                updatedBy: setting.updatedBy ? {
                    id: setting.updatedBy._id,
                    name: setting.updatedBy.fullName
                } : null,
                updatedAt: setting.updatedAt
            });
            return acc;
        }, {});

        console.log(`✅ Found ${settings.length} settings`);

        res.status(200).json({
            success: true,
            count: settings.length,
            settings: groupedSettings
        });

    } catch (error) {
        console.error('❌ Get all settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching settings',
            error: error.message
        });
    }
};

// ===== GET SINGLE SETTING =====
// GET /api/admin/settings/:key
exports.getSettingByKey = async (req, res) => {
    try {
        const { key } = req.params;

        console.log(`🔍 Fetching setting: ${key}`);

        const setting = await Setting.findOne({ key: key.toLowerCase() })
            .populate('updatedBy', 'fullName email role');

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        console.log(`✅ Setting found: ${setting.key}`);

        res.status(200).json({
            success: true,
            setting: {
                id: setting._id,
                key: setting.key,
                value: setting.value,
                type: setting.type,
                category: setting.category,
                description: setting.description,
                isPublic: setting.isPublic,
                isEditable: setting.isEditable,
                defaultValue: setting.defaultValue,
                updatedBy: setting.updatedBy ? {
                    id: setting.updatedBy._id,
                    name: setting.updatedBy.fullName,
                    email: setting.updatedBy.email,
                    role: setting.updatedBy.role
                } : null,
                createdAt: setting.createdAt,
                updatedAt: setting.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Get setting by key error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching setting',
            error: error.message
        });
    }
};

// ===== UPDATE SETTINGS (Bulk) =====
// PUT /api/admin/settings
exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        console.log(`✏️ Updating ${Object.keys(settings).length} settings...`);

        const results = {
            updated: [],
            created: [],
            errors: []
        };

        for (const [key, value] of Object.entries(settings)) {
            try {
                const setting = await Setting.findOne({ key: key.toLowerCase() });

                if (setting) {
                    // Check if editable
                    if (!setting.isEditable) {
                        results.errors.push({
                            key,
                            reason: 'Setting is not editable'
                        });
                        continue;
                    }

                    // Update existing setting
                    setting.value = value;
                    setting.updatedBy = req.admin._id;
                    await setting.save();

                    results.updated.push({
                        key: setting.key,
                        value: setting.value
                    });
                } else {
                    // Create new setting
                    const newSetting = await Setting.create({
                        key: key.toLowerCase(),
                        value,
                        type: typeof value === 'number' ? 'number' : 
                              typeof value === 'boolean' ? 'boolean' :
                              Array.isArray(value) ? 'array' :
                              typeof value === 'object' ? 'json' : 'string',
                        category: 'other',
                        updatedBy: req.admin._id
                    });

                    results.created.push({
                        key: newSetting.key,
                        value: newSetting.value
                    });
                }
            } catch (error) {
                results.errors.push({
                    key,
                    reason: error.message
                });
            }
        }

        console.log(`✅ Settings updated by admin: ${req.admin.email}`);
        console.log(`Updated: ${results.updated.length}, Created: ${results.created.length}, Errors: ${results.errors.length}`);

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            summary: {
                updated: results.updated.length,
                created: results.created.length,
                errors: results.errors.length
            },
            results
        });

    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating settings',
            error: error.message
        });
    }
};

// ===== UPDATE SINGLE SETTING =====
// PUT /api/admin/settings/:key
exports.updateSingleSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, isPublic, category } = req.body;

        console.log(`✏️ Updating setting: ${key}`);

        let setting = await Setting.findOne({ key: key.toLowerCase() });

        if (!setting) {
            // Create new setting if it doesn't exist
            setting = await Setting.create({
                key: key.toLowerCase(),
                value,
                type: typeof value === 'number' ? 'number' : 
                      typeof value === 'boolean' ? 'boolean' :
                      Array.isArray(value) ? 'array' :
                      typeof value === 'object' ? 'json' : 'string',
                category: category || 'other',
                description: description || '',
                isPublic: isPublic || false,
                updatedBy: req.admin._id
            });

            console.log(`✅ New setting created: ${setting.key}`);

            return res.status(201).json({
                success: true,
                message: 'Setting created successfully',
                setting: {
                    id: setting._id,
                    key: setting.key,
                    value: setting.value,
                    type: setting.type,
                    category: setting.category
                }
            });
        }

        // Check if editable
        if (!setting.isEditable) {
            return res.status(400).json({
                success: false,
                message: 'This setting is not editable'
            });
        }

        // Update fields
        if (value !== undefined) setting.value = value;
        if (description !== undefined) setting.description = description;
        if (isPublic !== undefined) setting.isPublic = isPublic;
        if (category !== undefined) setting.category = category;
        setting.updatedBy = req.admin._id;

        await setting.save();

        console.log(`✅ Setting updated by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Setting updated successfully',
            setting: {
                id: setting._id,
                key: setting.key,
                value: setting.value,
                type: setting.type,
                category: setting.category,
                updatedAt: setting.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update single setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating setting',
            error: error.message
        });
    }
};

// ===== INITIALIZE DEFAULT SETTINGS =====
// POST /api/admin/settings/initialize
exports.initializeDefaultSettings = async (req, res) => {
    try {
        console.log('🔄 Initializing default settings...');

        const defaultSettings = [
            // General Settings
            { key: 'platform_name', value: 'SkillLaunch', type: 'string', category: 'general', description: 'Platform name', isPublic: true, isEditable: true },
            { key: 'platform_tagline', value: 'Connect. Learn. Grow.', type: 'string', category: 'general', description: 'Platform tagline', isPublic: true, isEditable: true },
            { key: 'maintenance_mode', value: false, type: 'boolean', category: 'maintenance', description: 'Enable maintenance mode', isPublic: true, isEditable: true },
            { key: 'registration_enabled', value: true, type: 'boolean', category: 'features', description: 'Allow new user registrations', isPublic: true, isEditable: true },
            
            // Email Settings
            { key: 'email_from_name', value: 'SkillLaunch', type: 'string', category: 'email', description: 'Email sender name', isPublic: false, isEditable: true },
            { key: 'email_from_address', value: 'noreply@skilllaunch.com', type: 'string', category: 'email', description: 'Email sender address', isPublic: false, isEditable: true },
            { key: 'email_notifications_enabled', value: true, type: 'boolean', category: 'email', description: 'Enable email notifications', isPublic: false, isEditable: true },
            
            // Security Settings
            { key: 'password_min_length', value: 6, type: 'number', category: 'security', description: 'Minimum password length', isPublic: true, isEditable: true },
            { key: 'session_timeout', value: 24, type: 'number', category: 'security', description: 'Session timeout in hours', isPublic: false, isEditable: true },
            { key: 'max_login_attempts', value: 5, type: 'number', category: 'security', description: 'Maximum login attempts before lockout', isPublic: false, isEditable: true },
            
            // Feature Flags
            { key: 'enable_posts', value: true, type: 'boolean', category: 'features', description: 'Enable posts feature', isPublic: true, isEditable: true },
            { key: 'enable_messaging', value: true, type: 'boolean', category: 'features', description: 'Enable messaging feature', isPublic: true, isEditable: true },
            { key: 'enable_notifications', value: true, type: 'boolean', category: 'features', description: 'Enable notifications', isPublic: true, isEditable: true },
            
            // Limits
            { key: 'max_file_size_mb', value: 10, type: 'number', category: 'limits', description: 'Maximum file upload size in MB', isPublic: true, isEditable: true },
            { key: 'max_posts_per_day', value: 10, type: 'number', category: 'limits', description: 'Maximum posts per user per day', isPublic: true, isEditable: true },
            { key: 'max_profile_bio_length', value: 500, type: 'number', category: 'limits', description: 'Maximum profile bio length', isPublic: true, isEditable: true }
        ];

        const results = {
            created: 0,
            skipped: 0
        };

        for (const settingData of defaultSettings) {
            const existing = await Setting.findOne({ key: settingData.key });
            
            if (!existing) {
                await Setting.create({
                    ...settingData,
                    defaultValue: settingData.value,
                    updatedBy: req.admin._id
                });
                results.created++;
            } else {
                results.skipped++;
            }
        }

        console.log(`✅ Default settings initialized: ${results.created} created, ${results.skipped} skipped`);

        res.status(200).json({
            success: true,
            message: 'Default settings initialized successfully',
            results
        });

    } catch (error) {
        console.error('❌ Initialize default settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error initializing settings',
            error: error.message
        });
    }
};

// ===== GET SYSTEM HEALTH =====
// GET /api/admin/system/health
exports.getSystemHealth = async (req, res) => {
    try {
        console.log('🏥 Checking system health...');

        // Database health
        const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
        
        // Get database stats
        const dbStats = await mongoose.connection.db.stats();
        
        // Memory usage
        const memoryUsage = process.memoryUsage();
        
        // Uptime
        const uptime = process.uptime();
        
        // Get counts from various collections
        const User = require('../models/User');
        const Admin = require('../models/Admin');
        const Post = require('../models/Post');
        const Report = require('../models/Report');
        
        const userCount = await User.countDocuments();
        const adminCount = await Admin.countDocuments();
        const postCount = await Post.countDocuments();
        const reportCount = await Report.countDocuments();
        const settingCount = await Setting.countDocuments();

        const health = {
            status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatus,
                name: mongoose.connection.name,
                collections: dbStats.collections,
                dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
                indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`
            },
            server: {
                uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                nodeVersion: process.version,
                platform: process.platform,
                memory: {
                    used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
                }
            },
            collections: {
                users: userCount,
                admins: adminCount,
                posts: postCount,
                reports: reportCount,
                settings: settingCount
            }
        };

        console.log('✅ System health check completed');

        res.status(200).json({
            success: true,
            health
        });

    } catch (error) {
        console.error('❌ System health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking system health',
            error: error.message,
            health: {
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            }
        });
    }
};
