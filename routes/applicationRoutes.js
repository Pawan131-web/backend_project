// routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const multer = require('multer');
const path = require('path');

// Configure multer for resume uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/resumes/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and DOC/DOCX files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Student routes
router.post('/submit', applicationController.submitApplication);
router.get('/student/:studentId', applicationController.getStudentApplications);
router.get('/details/:applicationId', applicationController.getApplicationDetails);
router.put('/withdraw/:applicationId', applicationController.withdrawApplication);
router.get('/check/:studentId/:internshipId', applicationController.checkApplicationStatus);

// Get internship details for application view (includes portfolio check)
router.get('/internship/:internshipId', applicationController.getInternshipForApplication);

// Organization routes
router.get('/organization/:organizationId', applicationController.getOrganizationApplications);
router.get('/internship/:internshipId/applications', applicationController.getInternshipApplications);
router.put('/status/:applicationId', applicationController.updateApplicationStatus);

// Resume upload endpoint
router.post('/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Resume uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                mimeType: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to upload resume',
            error: error.message
        });
    }
});

module.exports = router;
