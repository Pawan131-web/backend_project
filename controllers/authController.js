// controllers/authController.js
const User = require('../models/User');
const emailService = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

function sanitizeFilename(filename) {
    return (filename || 'file')
        .toString()
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 120);
}

function parseDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return null;
    return {
        mime: match[1],
        buffer: Buffer.from(match[2], 'base64')
    };
}

function extensionFromMime(mime) {
    if (!mime) return '';
    const m = mime.toLowerCase();
    if (m === 'application/pdf') return '.pdf';
    if (m === 'image/jpeg') return '.jpg';
    if (m === 'image/png') return '.png';
    return '';
}

// Register new user
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, userType, username } = req.body;
        
        // 1. Check ALL required fields (including username)
        if (!fullName || !email || !password || !userType || !username) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fullName, email, password, userType, username'
            });
        }
        
        // 2. Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        // 3. NEW: Check if username already exists
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already taken'
            });
        }
        
        // 4. Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // 5. Create new user with verification code
        const user = await User.create({
            fullName,
            email,
            username: username.toLowerCase(), // Store lowercase
            password,
            userType,
            verificationCode,
            codeExpires,
            isVerified: false
        });

        // 6. Send verification email
        await emailService.sendVerificationEmail(email, verificationCode);
        
        // 7. Return success
        res.status(201).json({
            success: true,
            message: 'Registration successful! Verification code sent to your email.',
            note: 'Check your email for the 6-digit verification code',
            data: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isVerified: user.isVerified,
                needsVerification: true,
                orgVerificationStatus: user.orgVerificationStatus
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        
        // 2. Find user with password field included
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // 3. Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // 4. Check if user is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Account not verified',
                needsVerification: true,
                note: 'Please verify your email first'
            });
        }
        
        // 5. Compare password (using bcrypt in model)
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // 6. Remove password from response
        user.password = undefined;

        // 7. Create JWT token
        const token = jwt.sign(
            {
                id: user._id,
                userType: user.userType
            },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '7d' }
        );
        
        // 8. Return success WITH username
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isActive: user.isActive,
                isVerified: user.isVerified,
                orgVerificationStatus: user.orgVerificationStatus,
                orgRegistrationNumber: user.orgRegistrationNumber
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

// Verify email with code
exports.verifyEmail = async (req, res) => {
    try {
        console.log('🔍 Verification request received:', req.body);
        
        // Accept both 'verificationCode' or 'code' from frontend
        const { email, verificationCode, code } = req.body;
        const actualCode = verificationCode || code;
        
        // 1. Check required fields
        if (!email || !actualCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and verification code'
            });
        }
        
        console.log(`🔍 Looking for user: ${email}, code: ${actualCode}`);
        
        // 2. Find user by email
        const user = await User.findOne({ email })
            .select('+verificationCode +codeExpires +verificationAttempts');
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log(`🔍 User found: ${user.fullName}, Verified: ${user.isVerified}`);
        console.log(`🔍 Stored code: ${user.verificationCode}, Expires: ${user.codeExpires}`);
        
        // 3. Check if already verified
        if (user.isVerified) {
            console.log('✅ User already verified');
            return res.json({
                success: true,
                message: 'Email already verified',
                data: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    email: user.email,
                    userType: user.userType,
                    isVerified: true,
                    orgVerificationStatus: user.orgVerificationStatus
                }
            });
        }
        
        // 4. Check if code expired
        if (user.codeExpires && user.codeExpires < new Date()) {
            console.log('❌ Code expired');
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired',
                needsNewCode: true
            });
        }
        
        // 5. Compare codes
        if (user.verificationCode !== actualCode) {
            // Increment failed attempts
            user.verificationAttempts += 1;
            await user.save();

            console.log(`❌ Code mismatch. Attempts: ${user.verificationAttempts}`);
            
            // Check if too many attempts
            if (user.verificationAttempts >= 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please request a new code.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
                attemptsLeft: 5 - user.verificationAttempts
            });
        }
        
        // 6. SUCCESS: Mark as verified
        console.log('✅ Code verified successfully!');
        user.isVerified = true;
        user.verificationCode = undefined;
        user.codeExpires = undefined;
        user.verificationAttempts = 0;
        
        await user.save();
        
        // 7. Return success WITH username
        res.status(200).json({
            success: true,
            message: 'Email verified successfully!',
            data: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                isVerified: true,
                orgVerificationStatus: user.orgVerificationStatus
            }
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during verification',
            error: error.message
        });
    }
};

// Resend verification code
exports.resendCode = async (req, res) => {
    try {
        const { email } = req.body;
         
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.isVerified) {
            return res.json({
                success: true,
                message: 'Account already verified'
            });
        }
        
        // Generate new code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        // Update user
        user.verificationCode = verificationCode;
        user.codeExpires = codeExpires;
        user.verificationAttempts = 0;
        
        await user.save();
        
        // Send new email
        await emailService.sendVerificationEmail(email, verificationCode);
        
        res.json({
            success: true,
            message: 'New verification code sent to your email'
        });
        
    } catch (error) {
        console.error('Resend code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend code',
            error: error.message
        });
    }
};

// Submit organization verification details
exports.submitOrgVerification = async (req, res) => {
    try {
        const { email, registrationNumber, documents } = req.body;

        if (!email || !registrationNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email and registrationNumber are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.userType !== 'organization') {
            return res.status(400).json({
                success: false,
                message: 'Only organization accounts can submit organization verification'
            });
        }

        user.orgRegistrationNumber = registrationNumber.trim();
        user.orgVerificationStatus = 'pending';
        user.orgVerificationSubmittedAt = new Date();
        user.orgRejectionReason = undefined;

        if (Array.isArray(documents)) {
            const baseUploadDir = path.join(__dirname, '..', 'uploads', 'org-verification', String(user._id));
            fs.mkdirSync(baseUploadDir, { recursive: true });

            user.orgVerificationDocuments = documents.map(doc => {
                const docFiles = Array.isArray(doc.files)
                    ? doc.files.slice(0, 3).map((file, idx) => {
                        const parsed = parseDataUrl(file?.data);
                        if (!parsed) return null;

                        if (parsed.buffer.length > 5 * 1024 * 1024) return null;

                        const ext = extensionFromMime(parsed.mime) || path.extname(file?.name || '') || '.bin';
                        const safeOriginal = sanitizeFilename(file?.name || `document-${idx + 1}${ext}`);
                        const finalName = safeOriginal.toLowerCase().endsWith(ext) ? safeOriginal : `${safeOriginal}${ext}`;
                        const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}-${finalName}`;
                        const absolutePath = path.join(baseUploadDir, filename);
                        fs.writeFileSync(absolutePath, parsed.buffer);

                        return {
                            name: safeOriginal,
                            type: parsed.mime || file?.type || '',
                            size: parsed.buffer.length,
                            url: `/uploads/org-verification/${user._id}/${filename}`
                        };
                    }).filter(Boolean)
                    : [];

                return {
                    documentType: doc.documentType || '',
                    documentUrl: doc.documentUrl || '',
                    note: doc.note || '',
                    files: docFiles
                };
            });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Organization verification submitted successfully',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                userType: user.userType,
                orgVerificationStatus: user.orgVerificationStatus,
                orgRegistrationNumber: user.orgRegistrationNumber
            }
        });

    } catch (error) {
        console.error('Submit organization verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error submitting organization verification',
            error: error.message
        });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Profile endpoint - authentication needed',
            note: 'Will implement after adding JWT tokens'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};