// controllers/portfolioController.js
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');

// ===== CREATE OR UPDATE PORTFOLIO =====
exports.savePortfolio = async (req, res) => {
    try {
        const studentId = req.user.id;
        const portfolioData = req.body;
        
        // Check if student already has a portfolio
        let portfolio = await Portfolio.findOne({ studentId });
        
        if (portfolio) {
            // Update existing portfolio
            Object.assign(portfolio, {
                fullName: portfolioData.basicInfo?.fullName || portfolioData.fullName,
                professionalTitle: portfolioData.basicInfo?.professionalTitle || portfolioData.professionalTitle || '',
                email: portfolioData.basicInfo?.email || portfolioData.email || '',
                phone: portfolioData.basicInfo?.phone || portfolioData.phone || '',
                location: portfolioData.basicInfo?.location || portfolioData.location || '',
                university: portfolioData.basicInfo?.university || portfolioData.university || '',
                summary: portfolioData.basicInfo?.summary || portfolioData.summary || '',
                profilePhoto: portfolioData.profilePhoto || '',
                coverPhoto: portfolioData.coverPhoto || '',
                education: portfolioData.education || [],
                skills: portfolioData.skills || { technical: [], soft: '', languages: [] },
                experience: portfolioData.experience || [],
                projects: portfolioData.projects || [],
                certifications: portfolioData.certifications || [],
                additionalInfo: portfolioData.additionalInfo || '',
                socialLinks: portfolioData.socialLinks || {},
                previewHTML: portfolioData.previewHTML || '',
                status: portfolioData.status || 'draft'
            });
            
            if (portfolioData.status === 'published' && !portfolio.publishedAt) {
                portfolio.publishedAt = new Date();
                portfolio.isPublic = true;
            }
            
            await portfolio.save();
        } else {
            // Create new portfolio
            portfolio = new Portfolio({
                studentId,
                fullName: portfolioData.basicInfo?.fullName || portfolioData.fullName,
                professionalTitle: portfolioData.basicInfo?.professionalTitle || portfolioData.professionalTitle || '',
                email: portfolioData.basicInfo?.email || portfolioData.email || '',
                phone: portfolioData.basicInfo?.phone || portfolioData.phone || '',
                location: portfolioData.basicInfo?.location || portfolioData.location || '',
                university: portfolioData.basicInfo?.university || portfolioData.university || '',
                summary: portfolioData.basicInfo?.summary || portfolioData.summary || '',
                profilePhoto: portfolioData.profilePhoto || '',
                coverPhoto: portfolioData.coverPhoto || '',
                education: portfolioData.education || [],
                skills: portfolioData.skills || { technical: [], soft: '', languages: [] },
                experience: portfolioData.experience || [],
                projects: portfolioData.projects || [],
                certifications: portfolioData.certifications || [],
                additionalInfo: portfolioData.additionalInfo || '',
                socialLinks: portfolioData.socialLinks || {},
                previewHTML: portfolioData.previewHTML || '',
                status: portfolioData.status || 'draft'
            });
            
            if (portfolioData.status === 'published') {
                portfolio.publishedAt = new Date();
                portfolio.isPublic = true;
            }
            
            await portfolio.save();
        }
        
        res.status(200).json({
            success: true,
            message: portfolio.isNew ? 'Portfolio created successfully' : 'Portfolio updated successfully',
            portfolio: {
                id: portfolio._id,
                fullName: portfolio.fullName,
                status: portfolio.status,
                isPublic: portfolio.isPublic,
                shareToken: portfolio.shareToken,
                updatedAt: portfolio.updatedAt
            }
        });
    } catch (error) {
        console.error('Save portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save portfolio',
            error: error.message
        });
    }
};

// ===== GET MY PORTFOLIO =====
exports.getMyPortfolio = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOne({ studentId });
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found',
                hasPortfolio: false
            });
        }
        
        res.status(200).json({
            success: true,
            hasPortfolio: true,
            portfolio
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get portfolio',
            error: error.message
        });
    }
};

// ===== CHECK IF STUDENT HAS PORTFOLIO =====
exports.checkPortfolio = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOne({ studentId }).select('_id status isPublic shareToken fullName professionalTitle');
        
        res.status(200).json({
            success: true,
            hasPortfolio: !!portfolio,
            portfolio: portfolio ? {
                id: portfolio._id,
                status: portfolio.status,
                isPublic: portfolio.isPublic,
                shareToken: portfolio.shareToken,
                fullName: portfolio.fullName,
                professionalTitle: portfolio.professionalTitle
            } : null
        });
    } catch (error) {
        console.error('Check portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check portfolio',
            error: error.message
        });
    }
};

// ===== GET PUBLIC PORTFOLIO BY SHARE TOKEN =====
exports.getPublicPortfolio = async (req, res) => {
    try {
        const { shareToken } = req.params;
        
        const portfolio = await Portfolio.findOne({ 
            shareToken, 
            isPublic: true,
            status: 'published'
        }).select('-__v');
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found or not public'
            });
        }
        
        res.status(200).json({
            success: true,
            portfolio
        });
    } catch (error) {
        console.error('Get public portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get portfolio',
            error: error.message
        });
    }
};

// ===== GET PORTFOLIO BY STUDENT ID (for organizations) =====
exports.getPortfolioByStudentId = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const portfolio = await Portfolio.findOne({ 
            studentId,
            status: 'published'
        }).select('-__v');
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }
        
        // Get student info
        const student = await User.findById(studentId).select('fullName email profilePicture');
        
        res.status(200).json({
            success: true,
            portfolio,
            student
        });
    } catch (error) {
        console.error('Get portfolio by student ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get portfolio',
            error: error.message
        });
    }
};

// ===== PUBLISH PORTFOLIO =====
exports.publishPortfolio = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOne({ studentId });
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found. Please create a portfolio first.'
            });
        }
        
        portfolio.status = 'published';
        portfolio.isPublic = true;
        portfolio.publishedAt = new Date();
        
        // Generate share token if not exists
        if (!portfolio.shareToken) {
            portfolio.shareToken = portfolio._id.toString() + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }
        
        await portfolio.save();
        
        res.status(200).json({
            success: true,
            message: 'Portfolio published successfully',
            shareToken: portfolio.shareToken,
            shareUrl: `/portfolio/view/${portfolio.shareToken}`
        });
    } catch (error) {
        console.error('Publish portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish portfolio',
            error: error.message
        });
    }
};

// ===== TOGGLE PORTFOLIO VISIBILITY =====
exports.toggleVisibility = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOne({ studentId });
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }
        
        portfolio.isPublic = !portfolio.isPublic;
        await portfolio.save();
        
        res.status(200).json({
            success: true,
            message: `Portfolio is now ${portfolio.isPublic ? 'public' : 'private'}`,
            isPublic: portfolio.isPublic
        });
    } catch (error) {
        console.error('Toggle visibility error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle visibility',
            error: error.message
        });
    }
};

// ===== DELETE PORTFOLIO =====
exports.deletePortfolio = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOneAndDelete({ studentId });
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Portfolio deleted successfully'
        });
    } catch (error) {
        console.error('Delete portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete portfolio',
            error: error.message
        });
    }
};

// ===== GET SHARE LINK =====
exports.getShareLink = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const portfolio = await Portfolio.findOne({ studentId });
        
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: 'Portfolio not found'
            });
        }
        
        if (!portfolio.isPublic || portfolio.status !== 'published') {
            return res.status(400).json({
                success: false,
                message: 'Portfolio must be published to get share link'
            });
        }
        
        res.status(200).json({
            success: true,
            shareToken: portfolio.shareToken,
            shareUrl: `/portfolio/view/${portfolio.shareToken}`
        });
    } catch (error) {
        console.error('Get share link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get share link',
            error: error.message
        });
    }
};