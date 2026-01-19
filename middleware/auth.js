const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
    try {
        let token;

        const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || process.env.SECRET_KEY || 'secret_key';

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } 
        // Check for token in cookies
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // Make sure token exists
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized to access this route' 
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, jwtSecret);
            
            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (err) {
            console.error('Token verification error:', err);
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized, token failed' 
            });
        }
    } catch (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Grant access to specific user types (student/organization)
const authorize = (...userTypes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        
        if (!userTypes.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: `User type ${req.user.userType} is not authorized to access this route`
            });
        }

        next();
    };
};

module.exports = { protect, authorize };
