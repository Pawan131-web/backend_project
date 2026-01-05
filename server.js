const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cors = require('cors');
const adminUserRoutes = require('./routes/adminUserRoutes');
const bcrypt = require('bcryptjs'); 

const app = express();
app.use(express.json());

// Correct MongoDB connection for newer versions
const MONGODB_URI = 'mongodb://127.0.0.1:27017/skilllaunch';

// Create a default admin if none exists
const createDefaultAdmin = async () => {
    try {
        const Admin = require('./models/Admin');
        
        // Check if admin exists
        const adminExists = await Admin.findOne({ email: 'admin@skilllaunch.com' });
        
        if (!adminExists) {
            console.log('🔄 Creating default admin...');
            
            // Create admin WITHOUT triggering middleware
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            await Admin.create({
                fullName: 'Super Admin',
                email: 'admin@skilllaunch.com',
                password: hashedPassword, // Already hashed
                role: 'super_admin',
                permissions: {
                    manageUsers: true,
                    manageOrgs: true,
                    manageContent: true,
                    manageSkills: true,
                    sendAnnouncements: true,
                    viewAnalytics: true
                }
            });
            
            console.log('✅ Default admin created: admin@skilllaunch.com / admin123');
        } else {
            console.log('✅ Admin already exists');
        }
        
    } catch (error) {
        console.log('❌ Error creating default admin:', error.message);
        console.log('Error stack:', error.stack);
    }
};

// Connect to MongoDB and create admin
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📊 Database: ${MONGODB_URI}`);
        
        // Create default admin AFTER successful connection
        await createDefaultAdmin();
    })
    .catch(err => {
        console.log('❌ MongoDB Connection Failed:', err.message);
        console.log('\n💡 Try connecting with: mongosh');
    });

// CORS middleware
app.use(cors());

// Body parser middleware
app.use(express.json());

// Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', adminUserRoutes);
// Home route
app.get('/', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    
    res.json({
        message: 'SkillLaunch Backend API',
        status: 'Running',
        database: dbConnected ? 'Connected ✅' : 'Not Connected ❌',
        timestamp: new Date().toISOString(),
        endpoints: {
            test: 'GET /test',
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            admin: 'POST /api/admin/auth/login'
        }
    });
});

// Simple test route
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected',
        time: new Date().toISOString()
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log('🚀 Server started on http://localhost:' + PORT);
    console.log('🔐 Auth endpoints ready');
    console.log('   POST /api/auth/register');
    console.log('   POST /api/auth/login');
    console.log('   POST /api/admin/auth/login (admin: admin@skilllaunch.com / admin123)');
    console.log('   GET  /test');
});