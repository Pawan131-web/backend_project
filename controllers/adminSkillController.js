const Skill = require('../models/Skill');

// ===== GET ALL SKILLS =====
// GET /api/admin/skills
exports.getAllSkills = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            category = '',
            status = '', // active, inactive
            sortBy = 'popularity',
            sortOrder = 'desc'
        } = req.query;

        console.log('📋 Fetching skills with filters:', { page, limit, search, category, status });

        // Build query
        let query = {};

        // Search by name
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Filter by category
        if (category) {
            query.category = category;
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

        // Get skills with pagination
        const skills = await Skill.find(query)
            .populate('createdBy', 'fullName email')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count
        const total = await Skill.countDocuments(query);

        // Format response
        const formattedSkills = skills.map(skill => ({
            id: skill._id,
            name: skill.name,
            category: skill.category,
            description: skill.description,
            popularity: skill.popularity,
            isActive: skill.isActive,
            createdBy: skill.createdBy ? {
                id: skill.createdBy._id,
                name: skill.createdBy.fullName
            } : null,
            createdAt: skill.createdAt
        }));

        console.log(`✅ Found ${skills.length} skills`);

        res.status(200).json({
            success: true,
            count: skills.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
            skills: formattedSkills
        });

    } catch (error) {
        console.error('❌ Get all skills error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching skills',
            error: error.message
        });
    }
};

// ===== GET SINGLE SKILL =====
// GET /api/admin/skills/:id
exports.getSkillById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 Fetching skill ID: ${id}`);

        const skill = await Skill.findById(id)
            .populate('createdBy', 'fullName email role')
            .populate('relatedSkills', 'name category');

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        console.log(`✅ Skill found: ${skill.name}`);

        res.status(200).json({
            success: true,
            skill: {
                id: skill._id,
                name: skill.name,
                category: skill.category,
                description: skill.description,
                popularity: skill.popularity,
                isActive: skill.isActive,
                relatedSkills: skill.relatedSkills,
                createdBy: skill.createdBy ? {
                    id: skill.createdBy._id,
                    name: skill.createdBy.fullName,
                    email: skill.createdBy.email,
                    role: skill.createdBy.role
                } : null,
                createdAt: skill.createdAt,
                updatedAt: skill.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Get skill by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching skill',
            error: error.message
        });
    }
};

// ===== CREATE SKILL =====
// POST /api/admin/skills
exports.createSkill = async (req, res) => {
    try {
        const { name, category, description, relatedSkills } = req.body;

        // Validation
        if (!name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Skill name and category are required'
            });
        }

        console.log('📝 Creating new skill:', name);

        // Check if skill already exists
        const existingSkill = await Skill.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingSkill) {
            return res.status(400).json({
                success: false,
                message: 'Skill with this name already exists'
            });
        }

        // Create skill
        const skill = await Skill.create({
            name: name.trim(),
            category,
            description: description || '',
            relatedSkills: relatedSkills || [],
            createdBy: req.admin._id
        });

        // Populate creator info
        await skill.populate('createdBy', 'fullName email');

        console.log(`✅ Skill created by admin: ${req.admin.email}`);

        res.status(201).json({
            success: true,
            message: 'Skill created successfully',
            skill: {
                id: skill._id,
                name: skill.name,
                category: skill.category,
                description: skill.description,
                popularity: skill.popularity,
                isActive: skill.isActive,
                createdBy: {
                    id: skill.createdBy._id,
                    name: skill.createdBy.fullName
                },
                createdAt: skill.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create skill error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating skill',
            error: error.message
        });
    }
};

// ===== UPDATE SKILL =====
// PUT /api/admin/skills/:id
exports.updateSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, isActive, relatedSkills } = req.body;

        console.log(`✏️ Updating skill ID: ${id}`);

        const skill = await Skill.findById(id);

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        // Check if new name conflicts with existing skill
        if (name && name !== skill.name) {
            const existingSkill = await Skill.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: id }
            });

            if (existingSkill) {
                return res.status(400).json({
                    success: false,
                    message: 'Another skill with this name already exists'
                });
            }
        }

        // Update fields
        if (name) skill.name = name.trim();
        if (category) skill.category = category;
        if (description !== undefined) skill.description = description;
        if (isActive !== undefined) skill.isActive = isActive;
        if (relatedSkills !== undefined) skill.relatedSkills = relatedSkills;

        await skill.save();
        await skill.populate('createdBy', 'fullName email');

        console.log(`✅ Skill updated by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            skill: {
                id: skill._id,
                name: skill.name,
                category: skill.category,
                description: skill.description,
                popularity: skill.popularity,
                isActive: skill.isActive,
                updatedAt: skill.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update skill error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating skill',
            error: error.message
        });
    }
};

// ===== DELETE SKILL =====
// DELETE /api/admin/skills/:id
exports.deleteSkill = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ Deleting skill ID: ${id}`);

        const skill = await Skill.findById(id);

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'Skill not found'
            });
        }

        // Check if skill is being used (in a real app, check against user profiles, posts, etc.)
        // For now, we'll just delete it
        await Skill.findByIdAndDelete(id);

        console.log(`✅ Skill deleted by admin: ${req.admin.email}`);

        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully',
            deletedSkill: {
                id: skill._id,
                name: skill.name
            }
        });

    } catch (error) {
        console.error('❌ Delete skill error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting skill',
            error: error.message
        });
    }
};

// ===== GET SKILL CATEGORIES =====
// GET /api/admin/skills/categories
exports.getSkillCategories = async (req, res) => {
    try {
        console.log('📊 Fetching skill categories...');

        // Get all unique categories with skill counts
        const categories = await Skill.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    },
                    totalPopularity: { $sum: '$popularity' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Format response
        const formattedCategories = categories.map(cat => ({
            name: cat._id,
            skillCount: cat.count,
            activeSkills: cat.activeCount,
            totalPopularity: cat.totalPopularity
        }));

        console.log(`✅ Found ${categories.length} categories`);

        res.status(200).json({
            success: true,
            count: categories.length,
            categories: formattedCategories
        });

    } catch (error) {
        console.error('❌ Get skill categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching skill categories',
            error: error.message
        });
    }
};

// ===== BULK ADD SKILLS =====
// POST /api/admin/skills/bulk
exports.bulkAddSkills = async (req, res) => {
    try {
        const { skills } = req.body;

        // Validation
        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Skills array is required'
            });
        }

        console.log(`📝 Bulk adding ${skills.length} skills...`);

        const results = {
            created: [],
            skipped: [],
            errors: []
        };

        for (const skillData of skills) {
            try {
                // Check if required fields exist
                if (!skillData.name || !skillData.category) {
                    results.errors.push({
                        name: skillData.name || 'Unknown',
                        reason: 'Missing name or category'
                    });
                    continue;
                }

                // Check if skill already exists
                const existingSkill = await Skill.findOne({ 
                    name: { $regex: new RegExp(`^${skillData.name}$`, 'i') } 
                });

                if (existingSkill) {
                    results.skipped.push({
                        name: skillData.name,
                        reason: 'Already exists'
                    });
                    continue;
                }

                // Create skill
                const skill = await Skill.create({
                    name: skillData.name.trim(),
                    category: skillData.category,
                    description: skillData.description || '',
                    createdBy: req.admin._id
                });

                results.created.push({
                    id: skill._id,
                    name: skill.name,
                    category: skill.category
                });

            } catch (error) {
                results.errors.push({
                    name: skillData.name || 'Unknown',
                    reason: error.message
                });
            }
        }

        console.log(`✅ Bulk operation completed: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`);

        res.status(200).json({
            success: true,
            message: `Bulk operation completed`,
            summary: {
                total: skills.length,
                created: results.created.length,
                skipped: results.skipped.length,
                errors: results.errors.length
            },
            results
        });

    } catch (error) {
        console.error('❌ Bulk add skills error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in bulk operation',
            error: error.message
        });
    }
};

// ===== GET SKILL STATISTICS =====
// GET /api/admin/skills/stats
exports.getSkillStats = async (req, res) => {
    try {
        console.log('📊 Calculating skill statistics...');

        // Get counts
        const totalSkills = await Skill.countDocuments();
        const activeSkills = await Skill.countDocuments({ isActive: true });
        const inactiveSkills = await Skill.countDocuments({ isActive: false });

        // Get top skills by popularity
        const topSkills = await Skill.find({ isActive: true })
            .sort({ popularity: -1 })
            .limit(10)
            .select('name category popularity');

        // Get skills by category
        const skillsByCategory = await Skill.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Get recently added skills
        const recentSkills = await Skill.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name category createdAt')
            .populate('createdBy', 'fullName');

        console.log('✅ Statistics calculated successfully');

        res.status(200).json({
            success: true,
            stats: {
                total: totalSkills,
                active: activeSkills,
                inactive: inactiveSkills,
                topSkills: topSkills.map(skill => ({
                    id: skill._id,
                    name: skill.name,
                    category: skill.category,
                    popularity: skill.popularity
                })),
                byCategory: skillsByCategory.map(cat => ({
                    category: cat._id,
                    count: cat.count
                })),
                recentlyAdded: recentSkills.map(skill => ({
                    id: skill._id,
                    name: skill.name,
                    category: skill.category,
                    addedBy: skill.createdBy ? skill.createdBy.fullName : 'Unknown',
                    createdAt: skill.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('❌ Get skill stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching skill statistics',
            error: error.message
        });
    }
};
