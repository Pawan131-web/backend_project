const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get all internships (for students to browse)
exports.getAllInternships = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            skills = '',
            location = '',
            type = '',
            mode = '',
            duration = ''
        } = req.query;

        let query = {
            type: 'internship',
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        };

        // Search by title or content
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by skills
        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim());
            query.skills = { $in: skillsArray };
        }

        // Filter by location
        if (location) {
            query.internshipLocation = { $regex: location, $options: 'i' };
        }

        // Filter by type (remote, onsite, hybrid)
        const normalizedType = (type || '').toString().toLowerCase();
        const normalizedMode = (mode || '').toString().toLowerCase();
        const normalizedDuration = (duration || '').toString().toLowerCase();

        if (normalizedMode) {
            query.internshipMode = normalizedMode;
        } else if (normalizedType && ['remote', 'onsite', 'hybrid'].includes(normalizedType)) {
            query.internshipMode = normalizedType;
        }

        if (normalizedType && !['remote', 'onsite', 'hybrid'].includes(normalizedType)) {
            query.internshipType = normalizedType;
        }

        if (normalizedDuration) {
            let durationRegex;
            if (normalizedDuration === '1-3 months') {
                durationRegex = /^([1-3])\s*months?/i;
            } else if (normalizedDuration === '3-6 months') {
                durationRegex = /^([3-6])\s*months?/i;
            } else if (normalizedDuration === '6+ months') {
                durationRegex = /^([6-9]|1\d|2\d)\s*months?/i;
            } else {
                const escaped = normalizedDuration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                durationRegex = new RegExp(escaped, 'i');
            }
            query.internshipDuration = durationRegex;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const internships = await Post.find(query)
            .populate('userId', 'fullName email username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Post.countDocuments(query);

        const formattedInternships = internships.map(post => ({
            id: post._id,
            title: post.title,
            description: post.content,
            company: post.userId?.fullName || 'Unknown Company',
            companyEmail: post.userId?.email,
            companyUsername: post.userId?.username,
            location: post.internshipLocation,
            type: post.internshipType,
            mode: post.internshipMode,
            duration: post.internshipDuration,
            stipend: post.internshipStipend,
            openings: post.internshipOpenings,
            deadline: post.internshipDeadline,
            requirements: post.internshipRequirements,
            skills: post.skills || [],
            createdAt: post.createdAt,
            likes: post.likes || 0
        }));

        res.status(200).json({
            success: true,
            count: internships.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            internships: formattedInternships
        });

    } catch (error) {
        console.error('Get all internships error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching internships',
            error: error.message
        });
    }
};

// Get internships by organization ID
exports.getOrgInternships = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!orgId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {
            userId: orgId,
            type: 'internship',
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        };

        const internships = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Post.countDocuments(query);

        const formattedInternships = internships.map(post => ({
            id: post._id,
            title: post.title,
            description: post.content,
            location: post.internshipLocation,
            type: post.internshipType,
            mode: post.internshipMode,
            duration: post.internshipDuration,
            stipend: post.internshipStipend,
            openings: post.internshipOpenings,
            deadline: post.internshipDeadline,
            requirements: post.internshipRequirements,
            skills: post.skills || [],
            createdAt: post.createdAt,
            likes: post.likes || 0,
            views: post.views || 0
        }));

        res.status(200).json({
            success: true,
            count: internships.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            internships: formattedInternships
        });

    } catch (error) {
        console.error('Get org internships error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching organization internships',
            error: error.message
        });
    }
};

// Create a new internship post for an organization
exports.createInternshipPost = async (req, res) => {
    try {
        const {
            userId,
            title,
            description,
            internshipLocation,
            internshipType,
            internshipMode,
            internshipDuration,
            internshipStipend,
            internshipOpenings,
            internshipDeadline,
            internshipRequirements,
            skills
        } = req.body;

        if (!userId || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'userId, title and description are required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        if (user.userType !== 'organization') {
            return res.status(400).json({
                success: false,
                message: 'Only organization accounts can create internship posts'
            });
        }

        if (user.orgVerificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                message: 'Organization must be verified before posting internships'
            });
        }

        // Check if organization is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Your organization is blocked and cannot post internships'
            });
        }

        const normalizedSkills = Array.isArray(skills)
            ? skills.map(skill => (skill || '').trim()).filter(Boolean)
            : [];

        const internshipPost = await Post.create({
            userId: user._id,
            title: title.trim(),
            content: description.trim(),
            type: 'internship',
            skills: normalizedSkills,
            internshipLocation: internshipLocation || '',
            internshipType: internshipType || '',
            internshipMode: internshipMode || '',
            internshipDuration: internshipDuration || '',
            internshipStipend: internshipStipend || '',
            internshipOpenings: internshipOpenings || 0,
            internshipDeadline: internshipDeadline ? new Date(internshipDeadline) : undefined,
            internshipRequirements: internshipRequirements || ''
        });

        // Create notifications for all students about new internship
        try {
            const students = await User.find({ userType: 'student', isBlocked: { $ne: true } }).select('_id');
            const notifications = students.map(student => ({
                userId: student._id,
                type: 'new_internship',
                title: 'New Internship Posted',
                message: `${user.fullName} posted a new internship: ${title}`,
                isRead: false
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        } catch (notifError) {
            console.error('Error creating internship notifications:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Internship posted successfully',
            post: internshipPost
        });

    } catch (error) {
        console.error('Create internship post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating internship post',
            error: error.message
        });
    }
};

// ===== CREATE GENERAL FEED POST =====
exports.createFeedPost = async (req, res) => {
    try {
        const { userId, content, type, images, media, mediaType } = req.body;

        if (!userId || !content) {
            return res.status(400).json({
                success: false,
                message: 'userId and content are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Your account is blocked. You cannot create posts.'
            });
        }

        const post = await Post.create({
            userId: user._id,
            title: content.substring(0, 100),
            content: content.trim(),
            type: type || 'update',
            images: images || [],
            media: media || '',
            mediaType: mediaType || ''
        });

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: {
                id: post._id,
                content: post.content,
                type: post.type,
                images: post.images,
                media: post.media,
                mediaType: post.mediaType,
                createdAt: post.createdAt,
                author: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    userType: user.userType,
                    profilePicture: user.profilePicture || ''
                }
            }
        });

    } catch (error) {
        console.error('Create feed post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating post',
            error: error.message
        });
    }
};

// ===== GET ALL FEED POSTS (for home feed) =====
exports.getAllFeedPosts = async (req, res) => {
    try {
        const { page = 1, limit = 20, type = '' } = req.query;

        let query = {
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        };
        if (type) {
            query.type = type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const posts = await Post.find(query)
            .populate('userId', 'fullName username email userType profilePicture coverPhoto')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Post.countDocuments(query);

        const formattedPosts = posts.map(post => ({
            id: post._id,
            title: post.title,
            content: post.content,
            type: post.type,
            images: post.images || [],
            media: post.media || '',
            mediaType: post.mediaType || '',
            skills: post.skills || [],
            internshipLocation: post.internshipLocation,
            internshipMode: post.internshipMode,
            internshipDuration: post.internshipDuration,
            internshipStipend: post.internshipStipend,
            likes: post.likes || 0,
            likedBy: post.likedBy || [],
            savedBy: post.savedBy || [],
            comments: post.comments || 0,
            views: post.views || 0,
            createdAt: post.createdAt,
            author: post.userId ? {
                id: post.userId._id,
                fullName: post.userId.fullName,
                username: post.userId.username,
                userType: post.userId.userType,
                profilePicture: post.userId.profilePicture || '',
                coverPhoto: post.userId.coverPhoto || ''
            } : null
        }));

        res.status(200).json({
            success: true,
            count: posts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            posts: formattedPosts
        });

    } catch (error) {
        console.error('Get all feed posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching feed',
            error: error.message
        });
    }
};

// ===== UPDATE INTERNSHIP POST =====
exports.updateInternshipPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const {
            userId,
            title,
            description,
            internshipLocation,
            internshipType,
            internshipMode,
            internshipDuration,
            internshipStipend,
            internshipOpenings,
            internshipDeadline,
            internshipRequirements,
            skills
        } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Internship post not found'
            });
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own internship posts'
            });
        }

        if (post.type !== 'internship') {
            return res.status(400).json({
                success: false,
                message: 'This post is not an internship'
            });
        }

        const normalizedSkills = Array.isArray(skills)
            ? skills.map(skill => (skill || '').trim()).filter(Boolean)
            : [];

        post.title = title ? title.trim() : post.title;
        post.content = description ? description.trim() : post.content;
        post.skills = normalizedSkills;
        post.internshipLocation = internshipLocation || post.internshipLocation;
        post.internshipType = internshipType || post.internshipType;
        post.internshipMode = internshipMode || post.internshipMode;
        post.internshipDuration = internshipDuration || post.internshipDuration;
        post.internshipStipend = internshipStipend || post.internshipStipend;
        post.internshipOpenings = internshipOpenings !== undefined ? internshipOpenings : post.internshipOpenings;
        post.internshipDeadline = internshipDeadline ? new Date(internshipDeadline) : post.internshipDeadline;
        post.internshipRequirements = internshipRequirements || post.internshipRequirements;

        await post.save();

        res.status(200).json({
            success: true,
            message: 'Internship updated successfully',
            post
        });

    } catch (error) {
        console.error('Update internship post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating internship post',
            error: error.message
        });
    }
};

// ===== DELETE INTERNSHIP POST =====
exports.deleteInternshipPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Internship post not found'
            });
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own internship posts'
            });
        }

        if (post.type !== 'internship') {
            return res.status(400).json({
                success: false,
                message: 'This post is not an internship'
            });
        }

        post.status = 'removed';
        post.removedAt = new Date();
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Internship deleted successfully'
        });

    } catch (error) {
        console.error('Delete internship post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting internship post',
            error: error.message
        });
    }
};

// ===== LIKE/UNLIKE A POST (Toggle) =====
exports.likePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Initialize likedBy array if it doesn't exist
        if (!post.likedBy) {
            post.likedBy = [];
        }

        // Check if user has already liked this post
        const userIdStr = userId ? userId.toString() : null;
        const alreadyLiked = userIdStr && post.likedBy.some(id => id.toString() === userIdStr);

        if (alreadyLiked) {
            // Unlike: Remove user from likedBy array and decrement likes
            post.likedBy = post.likedBy.filter(id => id.toString() !== userIdStr);
            post.likes = Math.max(0, (post.likes || 1) - 1);
        } else {
            // Like: Add user to likedBy array and increment likes
            if (userIdStr) {
                post.likedBy.push(userId);
            }
            post.likes = (post.likes || 0) + 1;
            
            // Create notification for post owner (if not liking own post)
            try {
                if (post.userId.toString() !== userIdStr) {
                    const liker = await User.findById(userId).select('fullName username');
                    await Notification.create({
                        userId: post.userId,
                        type: 'post_liked',
                        title: 'New Like',
                        message: `${liker?.fullName || 'Someone'} liked your post`,
                        relatedId: postId,
                        relatedModel: 'Post',
                        isRead: false
                    });
                }
            } catch (notifError) {
                console.error('Error creating like notification:', notifError);
            }
        }

        await post.save();

        res.status(200).json({
            success: true,
            likes: post.likes,
            liked: !alreadyLiked,
            message: alreadyLiked ? 'Post unliked' : 'Post liked'
        });

    } catch (error) {
        console.error('Like/unlike post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ===== RECOMMENDATION ENGINE =====
const recommendationEngine = require('../utils/recommendationEngine');

// Get recommended internships for a student based on their skills
exports.getRecommendedInternships = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, minMatch = 0 } = req.query;

        // Get student's skills from request body or fetch from user
        let studentSkills = req.body.skills || [];

        // If no skills provided, try to get from user profile
        if (studentSkills.length === 0 && userId) {
            const user = await User.findById(userId);
            if (user && user.portfolioData?.skills?.technical) {
                studentSkills = user.portfolioData.skills.technical;
            }
        }

        // Get all active internships
        const internships = await Post.find({
            type: 'internship',
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        })
        .populate('userId', 'fullName email username orgType')
        .sort({ createdAt: -1 });

        // Calculate recommendations
        let recommendations = recommendationEngine.getRecommendationsForStudent(studentSkills, internships);

        // Filter by minimum match percentage
        if (minMatch > 0) {
            recommendations = recommendations.filter(r => r.matchPercentage >= parseInt(minMatch));
        }

        // Paginate results
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedRecommendations = recommendations.slice(skip, skip + parseInt(limit));

        // Format response
        const formattedRecommendations = paginatedRecommendations.map(post => ({
            id: post._id,
            title: post.title,
            description: post.content,
            company: post.userId?.fullName || 'Unknown Company',
            companyEmail: post.userId?.email,
            companyUsername: post.userId?.username,
            orgType: post.userId?.orgType,
            location: post.internshipLocation,
            type: post.internshipType,
            mode: post.internshipMode,
            duration: post.internshipDuration,
            stipend: post.internshipStipend,
            openings: post.internshipOpenings,
            deadline: post.internshipDeadline,
            requirements: post.internshipRequirements,
            skills: post.skills || [],
            skillsWithLevels: post.skillsWithLevels || [],
            createdAt: post.createdAt,
            likes: post.likes || 0,
            views: post.views || 0,
            // Recommendation data
            matchPercentage: post.matchPercentage,
            matchLevel: post.matchLevel,
            matchedSkills: post.matchedSkills,
            missingSkills: post.missingSkills,
            matchMessage: post.matchMessage
        }));

        res.status(200).json({
            success: true,
            count: formattedRecommendations.length,
            total: recommendations.length,
            page: parseInt(page),
            pages: Math.ceil(recommendations.length / parseInt(limit)),
            recommendations: formattedRecommendations
        });

    } catch (error) {
        console.error('Get recommended internships error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching recommendations',
            error: error.message
        });
    }
};

// Calculate match percentage for a specific internship
exports.calculateMatchForInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const { skills } = req.body;

        if (!skills || !Array.isArray(skills)) {
            return res.status(400).json({
                success: false,
                message: 'Skills array is required'
            });
        }

        const internship = await Post.findById(internshipId);

        if (!internship || internship.type !== 'internship') {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }

        // Get required skills from internship
        let requiredSkills = [];
        if (internship.skillsWithLevels && internship.skillsWithLevels.length > 0) {
            requiredSkills = internship.skillsWithLevels;
        } else if (internship.skills && internship.skills.length > 0) {
            requiredSkills = internship.skills.map(s => ({ name: s, level: 'intermediate' }));
        }

        const matchResult = recommendationEngine.calculateMatchPercentage(skills, requiredSkills);

        res.status(200).json({
            success: true,
            internshipId: internship._id,
            internshipTitle: internship.title,
            ...matchResult
        });

    } catch (error) {
        console.error('Calculate match error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error calculating match',
            error: error.message
        });
    }
};

// Get top applicants for an internship (for organizations)
exports.getTopApplicantsForInternship = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const { limit = 20 } = req.query;

        const internship = await Post.findById(internshipId);

        if (!internship || internship.type !== 'internship') {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }

        // Get all student users with portfolio data
        const students = await User.find({
            userType: 'student',
            isVerified: true
        }).select('fullName email username portfolioData skills');

        // Calculate rankings using the recommendation engine
        const rankedApplicants = recommendationEngine.getTopApplicants(internship, students);

        // Get top N applicants
        const topApplicants = rankedApplicants.slice(0, parseInt(limit)).map(student => ({
            id: student._id,
            fullName: student.fullName,
            email: student.email,
            username: student.username,
            matchPercentage: student.matchPercentage,
            matchLevel: student.matchLevel,
            matchedSkills: student.matchedSkills,
            missingSkills: student.missingSkills
        }));

        res.status(200).json({
            success: true,
            internshipId: internship._id,
            internshipTitle: internship.title,
            count: topApplicants.length,
            totalStudents: students.length,
            topApplicants
        });

    } catch (error) {
        console.error('Get top applicants error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching top applicants',
            error: error.message
        });
    }
};

// Get internships with recommendations (combined endpoint for Explore page)
exports.getInternshipsWithRecommendations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            skills = '',
            location = '',
            mode = '',
            duration = '',
            sortBy = 'recommendation' // 'recommendation', 'recent', 'popular'
        } = req.query;

        // Student skills from body (sent from frontend localStorage)
        const studentSkills = req.body.skills || [];

        // Build base query
        let query = {
            type: 'internship',
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        };

        // Apply filters
        if (search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim());
            query.skills = { $in: skillsArray };
        }

        if (location) {
            query.internshipLocation = { $regex: location, $options: 'i' };
        }

        if (mode) {
            query.internshipMode = mode.toLowerCase();
        }

        if (duration) {
            query.internshipDuration = { $regex: duration, $options: 'i' };
        }

        // Fetch all matching internships
        let internships = await Post.find(query)
            .populate('userId', 'fullName email username orgType')
            .sort({ createdAt: -1 });

        // Calculate match percentages if student has skills
        let processedInternships;
        if (studentSkills.length > 0) {
            processedInternships = recommendationEngine.getRecommendationsForStudent(studentSkills, internships);
        } else {
            processedInternships = internships.map(i => ({
                ...i.toObject(),
                matchPercentage: null,
                matchLevel: null,
                matchedSkills: [],
                missingSkills: []
            }));
        }

        // Sort based on sortBy parameter
        if (sortBy === 'recommendation' && studentSkills.length > 0) {
            // Already sorted by match percentage from recommendation engine
        } else if (sortBy === 'popular') {
            processedInternships.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else {
            // Default: recent
            processedInternships.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Paginate
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedResults = processedInternships.slice(skip, skip + parseInt(limit));

        // Format response
        const formattedResults = paginatedResults.map(post => ({
            id: post._id,
            title: post.title,
            description: post.content,
            company: post.userId?.fullName || 'Unknown Company',
            companyEmail: post.userId?.email,
            companyUsername: post.userId?.username,
            orgType: post.userId?.orgType,
            location: post.internshipLocation,
            type: post.internshipType,
            mode: post.internshipMode,
            duration: post.internshipDuration,
            stipend: post.internshipStipend,
            openings: post.internshipOpenings,
            deadline: post.internshipDeadline,
            requirements: post.internshipRequirements,
            skills: post.skills || [],
            skillsWithLevels: post.skillsWithLevels || [],
            createdAt: post.createdAt,
            likes: post.likes || 0,
            views: post.views || 0,
            // Match data (null if no student skills provided)
            matchPercentage: post.matchPercentage,
            matchLevel: post.matchLevel,
            matchedSkills: post.matchedSkills || [],
            missingSkills: post.missingSkills || [],
            matchMessage: post.matchMessage
        }));

        // Separate recommended vs other internships for frontend
        const recommended = formattedResults.filter(r => r.matchPercentage >= 50);
        const others = formattedResults.filter(r => r.matchPercentage < 50 || r.matchPercentage === null);

        res.status(200).json({
            success: true,
            count: formattedResults.length,
            total: processedInternships.length,
            page: parseInt(page),
            pages: Math.ceil(processedInternships.length / parseInt(limit)),
            hasStudentSkills: studentSkills.length > 0,
            internships: formattedResults,
            recommended: recommended,
            others: others
        });

    } catch (error) {
        console.error('Get internships with recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// ===== LIKE/UNLIKE POST =====
exports.toggleLikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const userIndex = post.likedBy.indexOf(userId);
        let action = '';

        if (userIndex > -1) {
            // Unlike
            post.likedBy.splice(userIndex, 1);
            post.likes = Math.max(0, (post.likes || 1) - 1);
            action = 'unliked';
        } else {
            // Like
            post.likedBy.push(userId);
            post.likes = (post.likes || 0) + 1;
            action = 'liked';

            // Create notification for post owner (if not liking own post)
            if (post.userId.toString() !== userId) {
                const liker = await User.findById(userId).select('fullName username');
                await Notification.create({
                    userId: post.userId,
                    type: 'post_liked',
                    title: 'New Like',
                    message: `${liker?.fullName || 'Someone'} liked your post`,
                    relatedId: postId,
                    relatedModel: 'Post'
                });
            }
        }

        await post.save();

        res.status(200).json({
            success: true,
            action,
            likes: post.likes,
            isLiked: action === 'liked'
        });

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== SAVE/UNSAVE POST =====
exports.toggleSavePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const userIndex = post.savedBy.indexOf(userId);
        let action = '';

        if (userIndex > -1) {
            post.savedBy.splice(userIndex, 1);
            action = 'unsaved';
        } else {
            post.savedBy.push(userId);
            action = 'saved';
        }

        await post.save();

        res.status(200).json({
            success: true,
            action,
            isSaved: action === 'saved'
        });

    } catch (error) {
        console.error('Toggle save error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== ADD COMMENT TO POST =====
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId, content } = req.body;

        if (!userId || !content) {
            return res.status(400).json({ success: false, message: 'userId and content are required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const commenter = await User.findById(userId).select('fullName username profilePicture');

        post.commentsList.push({
            userId,
            content: content.trim(),
            createdAt: new Date()
        });
        post.comments = (post.comments || 0) + 1;

        await post.save();

        // Create notification for post owner
        if (post.userId.toString() !== userId) {
            await Notification.create({
                userId: post.userId,
                type: 'post_comment',
                title: 'New Comment',
                message: `${commenter?.fullName || 'Someone'} commented on your post`,
                relatedId: postId,
                relatedModel: 'Post'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Comment added',
            comment: {
                userId,
                content: content.trim(),
                createdAt: new Date(),
                author: {
                    fullName: commenter?.fullName,
                    username: commenter?.username,
                    profilePicture: commenter?.profilePicture || ''
                }
            },
            totalComments: post.comments
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== GET POST COMMENTS =====
exports.getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findById(postId)
            .populate('commentsList.userId', 'fullName username profilePicture');

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const comments = (post.commentsList || []).map(c => ({
            id: c._id,
            content: c.content,
            createdAt: c.createdAt,
            author: c.userId ? {
                id: c.userId._id,
                fullName: c.userId.fullName,
                username: c.userId.username,
                profilePicture: c.userId.profilePicture || ''
            } : null
        }));

        res.status(200).json({
            success: true,
            comments,
            total: comments.length
        });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== DELETE POST (owner only) =====
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Check ownership
        if (post.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
        }

        await Post.findByIdAndDelete(postId);

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== GET USER'S OWN POSTS =====
exports.getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        const posts = await Post.find({ userId })
            .populate('userId', 'fullName username profilePicture userType')
            .sort({ createdAt: -1 });

        const formattedPosts = posts.map(post => ({
            id: post._id,
            content: post.content,
            type: post.type,
            media: post.media || '',
            mediaType: post.mediaType || '',
            likes: post.likes || 0,
            comments: post.comments || 0,
            createdAt: post.createdAt,
            author: post.userId ? {
                id: post.userId._id,
                fullName: post.userId.fullName,
                username: post.userId.username,
                profilePicture: post.userId.profilePicture || ''
            } : null
        }));

        res.status(200).json({
            success: true,
            posts: formattedPosts,
            count: formattedPosts.length
        });

    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== GET USER'S SAVED POSTS =====
exports.getSavedPosts = async (req, res) => {
    try {
        const { userId } = req.params;

        const posts = await Post.find({ savedBy: userId })
            .populate('userId', 'fullName username profilePicture userType')
            .sort({ createdAt: -1 });

        const formattedPosts = posts.map(post => ({
            id: post._id,
            content: post.content,
            type: post.type,
            media: post.media || '',
            mediaType: post.mediaType || '',
            likes: post.likes || 0,
            comments: post.comments || 0,
            createdAt: post.createdAt,
            author: post.userId ? {
                id: post.userId._id,
                fullName: post.userId.fullName,
                username: post.userId.username,
                profilePicture: post.userId.profilePicture || ''
            } : null
        }));

        res.status(200).json({
            success: true,
            posts: formattedPosts,
            count: formattedPosts.length
        });

    } catch (error) {
        console.error('Get saved posts error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ===== UPDATE POST (owner only) =====
exports.updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId, content, media, mediaType } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Check ownership
        if (post.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this post' });
        }

        // Update fields
        if (content !== undefined) {
            post.content = content.trim();
            post.title = content.substring(0, 100);
        }
        if (media !== undefined) post.media = media;
        if (mediaType !== undefined) post.mediaType = mediaType;

        await post.save();

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            post: {
                id: post._id,
                content: post.content,
                media: post.media,
                mediaType: post.mediaType
            }
        });

    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
