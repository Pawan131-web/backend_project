const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect admin routes
exports.protect = async (req, res, next) => {
    try {
        let token;
        
        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }
        
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin_secret_key');
            
            // Check if admin exists and is active
            const admin = await Admin.findById(decoded.id);
            
            if (!admin || admin.isActive === false) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin no longer exists or is deactivated'
                });
            }
            
            // Add admin to request object
            req.admin = admin;
            next();
            
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }
        
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Check admin permissions
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }
        
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: `Role ${req.admin.role} is not authorized to access this route`
            });
        }
        
        next();
    };
};

// Check specific permission
exports.hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }
        
        if (!req.admin.permissions[permission]) {
            return res.status(403).json({
                success: false,
                message: `You don't have permission to ${permission}`
            });
        }
        
        next();
    };
};