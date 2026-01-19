// controllers/applicationController.js
const Application = require('../models/Application');
const Post = require('../models/Post');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Helper to create notification
const createNotification = async (userId, type, title, message, data = {}) => {
    try {
        return await Notification.create({ userId, type, title, message, data });
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};

// Helper to save base64 file
const saveBase64File = (base64Data, fileName, studentId) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads/resumes');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid base64 data');
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        
        const ext = mimeType === 'application/pdf' ? '.pdf' : 
                   mimeType === 'application/msword' ? '.doc' : '.docx';
        const uniqueFileName = `resume-${studentId}-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFileName);

        fs.writeFileSync(filePath, buffer);

        return {
            filename: uniqueFileName,
            originalName: fileName || uniqueFileName,
            path: filePath,
            mimeType: mimeType,
            size: buffer.length
        };
    } catch (error) {
        console.error('Error saving resume file:', error);
        return null;
    }
};

// Submit a new application
const submitApplication = async (req, res) => {
    try {
        const { internshipId, message, resumeType, resumeReference, resumeFileName } = req.body;
        const studentId = req.body.studentId;

        // Validate required fields
        if (!internshipId || !studentId || !resumeType) {
            return res.status(400).json({
                success: false,
                message: 'Internship ID, Student ID, and Resume Type are required'
            });
        }

        // Normalize resumeType ('upload' from frontend -> 'uploaded' for DB)
        const normalizedResumeType = resumeType === 'upload' ? 'uploaded' : resumeType;

        // Check if internship exists and is active
        const internship = await Post.findOne({ 
            _id: internshipId, 
            type: 'internship',
            status: 'active'
        }).populate('userId', 'fullName email organizationName');

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found or no longer active'
            });
        }

        // Check for duplicate application
        const existingApplication = await Application.findOne({
            studentId,
            internshipId
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this internship'
            });
        }

        // Prepare application data
        const applicationData = {
            studentId,
            internshipId,
            organizationId: internship.userId._id,
            message: message || '',
            resumeType: normalizedResumeType
        };

        // Handle uploaded resume
        if (normalizedResumeType === 'uploaded' && resumeReference) {
            const savedFile = saveBase64File(resumeReference, resumeFileName, studentId);
            if (savedFile) {
                applicationData.uploadedResume = savedFile;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to save uploaded resume. Please try again.'
                });
            }
        }

        // Handle portfolio-based resume
        if (normalizedResumeType === 'portfolio') {
            const portfolio = await Portfolio.findOne({ studentId });
            
            if (!portfolio) {
                return res.status(400).json({
                    success: false,
                    message: 'No portfolio found. Please create a portfolio first or upload a resume.'
                });
            }

            applicationData.portfolioId = portfolio._id;
            
            // Create snapshot of portfolio at application time
            applicationData.portfolioSnapshot = {
                fullName: portfolio.fullName,
                professionalTitle: portfolio.professionalTitle,
                email: portfolio.email,
                phone: portfolio.phone,
                summary: portfolio.summary,
                skills: portfolio.skills,
                education: portfolio.education,
                experience: portfolio.experience,
                projects: portfolio.projects,
                certifications: portfolio.certifications,
                previewHTML: portfolio.previewHTML
            };
        }

        // Create the application
        const application = await Application.create(applicationData);

        // Get student info for notification
        const student = await User.findById(studentId).select('fullName');

        // Notify organization about new application
        await createNotification(
            internship.userId._id,
            'application_received',
            'New Application Received',
            `${student?.fullName || 'A student'} applied for "${internship.title}"`,
            {
                applicationId: application._id,
                internshipId: internshipId,
                internshipTitle: internship.title,
                studentId: studentId,
                studentName: student?.fullName
            }
        );

        // Notify student about successful application
        await createNotification(
            studentId,
            'application',
            'Application Submitted',
            `Your application for "${internship.title}" has been submitted successfully`,
            {
                applicationId: application._id,
                internshipId: internshipId,
                internshipTitle: internship.title,
                organizationName: internship.userId.organizationName || internship.userId.fullName
            }
        );

        // Populate for response
        const populatedApplication = await Application.findById(application._id)
            .populate('internshipId', 'title content internshipLocation internshipDuration internshipStipend')
            .populate('organizationId', 'fullName organizationName email');

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: populatedApplication
        });

    } catch (error) {
        console.error('Submit application error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this internship'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to submit application',
            error: error.message
        });
    }
};

// Get all applications for a student
const getStudentApplications = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        if (!mongoose.isValidObjectId(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student id'
            });
        }
 
        const query = { studentId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const applications = await Application.find(query)
            .populate({
                path: 'internshipId',
                select: 'title content internshipLocation internshipDuration internshipStipend internshipType internshipMode skills skillsWithLevels internshipDeadline internshipOpenings createdAt',
                populate: {
                    path: 'userId',
                    select: 'fullName organizationName email profilePicture'
                }
            })
            .populate('organizationId', 'fullName organizationName email profilePicture')
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Application.countDocuments(query);

        // Get counts by status
        const statusCounts = await Application.aggregate([
            { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = {
            total,
            pending: 0,
            shortlisted: 0,
            accepted: 0,
            rejected: 0,
            withdrawn: 0
        };

        statusCounts.forEach(item => {
            counts[item._id] = item.count;
        });

        res.status(200).json({
            success: true,
            data: applications,
            counts,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasMore: skip + applications.length < total
            }
        });

    } catch (error) {
        console.error('Get student applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            error: error.message
        });
    }
};

// Get single application details
const getApplicationDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Application.findById(applicationId)
            .populate({
                path: 'internshipId',
                populate: {
                    path: 'userId',
                    select: 'fullName organizationName email profilePicture'
                }
            })
            .populate('organizationId', 'fullName organizationName email profilePicture')
            .populate('portfolioId');

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        res.status(200).json({
            success: true,
            data: application
        });

    } catch (error) {
        console.error('Get application details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application details',
            error: error.message
        });
    }
};

// Withdraw an application (student side)
const withdrawApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { studentId } = req.body;

        const application = await Application.findOne({
            _id: applicationId,
            studentId
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        if (application.status === 'withdrawn') {
            return res.status(400).json({
                success: false,
                message: 'Application is already withdrawn'
            });
        }

        if (['accepted', 'rejected'].includes(application.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot withdraw an application that has been processed'
            });
        }

        application.status = 'withdrawn';
        application.statusHistory.push({
            status: 'withdrawn',
            changedAt: new Date(),
            changedBy: studentId,
            note: 'Application withdrawn by student'
        });

        await application.save();

        res.status(200).json({
            success: true,
            message: 'Application withdrawn successfully',
            data: application
        });

    } catch (error) {
        console.error('Withdraw application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to withdraw application',
            error: error.message
        });
    }
};

// Check if student has applied to an internship
const checkApplicationStatus = async (req, res) => {
    try {
        const { studentId, internshipId } = req.params;

        const application = await Application.findOne({
            studentId,
            internshipId
        }).select('status appliedAt');

        res.status(200).json({
            success: true,
            hasApplied: !!application,
            data: application
        });

    } catch (error) {
        console.error('Check application status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check application status',
            error: error.message
        });
    }
};

// Get applications for an internship (organization side)
const getInternshipApplications = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        const query = { internshipId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const applications = await Application.find(query)
            .populate('studentId', 'fullName email profilePicture skills education')
            .populate('portfolioId')
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Application.countDocuments(query);

        res.status(200).json({
            success: true,
            data: applications,
            total,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasMore: skip + applications.length < total
            }
        });

    } catch (error) {
        console.error('Get internship applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            error: error.message
        });
    }
};

// Update application status (organization side)
const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, note, organizationId } = req.body;

        const validStatuses = ['pending', 'shortlisted', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const application = await Application.findOne({
            _id: applicationId,
            organizationId
        }).populate('internshipId', 'title');

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const previousStatus = application.status;
        application.status = status;
        application.statusHistory.push({
            status,
            changedAt: new Date(),
            changedBy: organizationId,
            note: note || `Status changed to ${status}`
        });

        if (status !== 'pending') {
            application.reviewedAt = new Date();
        }

        await application.save();

        // Get organization name for notification
        const organization = await User.findById(organizationId).select('fullName organizationName');
        const orgName = organization?.organizationName || organization?.fullName || 'Organization';
        const internshipTitle = application.internshipId?.title || 'Internship';

        // Send notification to student about status change
        const statusMessages = {
            shortlisted: `Great news! Your application for "${internshipTitle}" has been shortlisted by ${orgName}`,
            accepted: `Congratulations! Your application for "${internshipTitle}" has been accepted by ${orgName}`,
            rejected: `Your application for "${internshipTitle}" was not selected by ${orgName}`
        };

        const notificationTypes = {
            shortlisted: 'application_shortlisted',
            accepted: 'application_accepted',
            rejected: 'application_rejected'
        };

        if (statusMessages[status]) {
            await createNotification(
                application.studentId,
                notificationTypes[status],
                `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                statusMessages[status],
                {
                    applicationId: application._id,
                    internshipId: application.internshipId._id,
                    internshipTitle: internshipTitle,
                    organizationName: orgName,
                    status: status,
                    previousStatus: previousStatus,
                    note: note || ''
                }
            );
        }

        res.status(200).json({
            success: true,
            message: `Application ${status}`,
            data: application
        });

    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application status',
            error: error.message
        });
    }
};

// Get internship details for application view
const getInternshipForApplication = async (req, res) => {
    try {
        const { internshipId } = req.params;
        const { studentId } = req.query;

        const internship = await Post.findOne({
            _id: internshipId,
            type: 'internship'
        }).populate('userId', 'fullName organizationName email profilePicture');

        if (!internship) {
            return res.status(404).json({
                success: false,
                message: 'Internship not found'
            });
        }

        // Check if student has already applied
        let applicationStatus = null;
        if (studentId) {
            const existingApplication = await Application.findOne({
                studentId,
                internshipId
            }).select('status appliedAt');

            if (existingApplication) {
                applicationStatus = {
                    hasApplied: true,
                    status: existingApplication.status,
                    appliedAt: existingApplication.appliedAt
                };
            }
        }

        // Check if student has a portfolio
        let hasPortfolio = false;
        let portfolioPreview = null;
        if (studentId) {
            const portfolio = await Portfolio.findOne({ studentId })
                .select('fullName professionalTitle summary skills status previewHTML');
            
            if (portfolio) {
                hasPortfolio = true;
                portfolioPreview = {
                    fullName: portfolio.fullName,
                    professionalTitle: portfolio.professionalTitle,
                    summary: portfolio.summary,
                    skills: portfolio.skills,
                    status: portfolio.status,
                    hasPreview: !!portfolio.previewHTML
                };
            }
        }

        res.status(200).json({
            success: true,
            data: {
                internship,
                applicationStatus,
                hasPortfolio,
                portfolioPreview
            }
        });

    } catch (error) {
        console.error('Get internship for application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch internship details',
            error: error.message
        });
    }
};

// Get all applications for an organization (grouped by internship)
const getOrganizationApplications = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;

        if (!mongoose.isValidObjectId(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization id'
            });
        }

        const query = { organizationId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const applications = await Application.find(query)
            .populate('studentId', 'fullName email profilePicture username')
            .populate('internshipId', 'title internshipLocation internshipDuration internshipStipend internshipType status')
            .populate('portfolioId', 'fullName professionalTitle summary skills previewHTML')
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Application.countDocuments(query);

        // Get counts by status
        const statusCounts = await Application.aggregate([
            { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = {
            total,
            pending: 0,
            shortlisted: 0,
            accepted: 0,
            rejected: 0,
            withdrawn: 0
        };

        statusCounts.forEach(item => {
            counts[item._id] = item.count;
        });

        // Group applications by internship
        const groupedByInternship = {};
        applications.forEach(app => {
            const internshipId = app.internshipId?._id?.toString() || 'unknown';
            if (!groupedByInternship[internshipId]) {
                groupedByInternship[internshipId] = {
                    internship: app.internshipId,
                    applications: []
                };
            }
            groupedByInternship[internshipId].applications.push(app);
        });

        res.status(200).json({
            success: true,
            data: applications,
            grouped: Object.values(groupedByInternship),
            counts,
            total,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasMore: skip + applications.length < total
            }
        });

    } catch (error) {
        console.error('Get organization applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch applications',
            error: error.message
        });
    }
};

module.exports = {
    submitApplication,
    getStudentApplications,
    getApplicationDetails,
    withdrawApplication,
    checkApplicationStatus,
    getInternshipApplications,
    updateApplicationStatus,
    getInternshipForApplication,
    getOrganizationApplications
};
