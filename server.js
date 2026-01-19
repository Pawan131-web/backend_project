const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cors = require('cors');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminOrgRoutes = require('./routes/adminOrgRoutes');
const adminContentRoutes = require('./routes/adminContentRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminAnnouncementRoutes = require('./routes/adminAnnouncementRoutes');
const adminSkillRoutes = require('./routes/adminSkillRoutes');
const adminSettingRoutes = require('./routes/adminSettingRoutes');
const adminManagementRoutes = require('./routes/adminManagementRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const appealRoutes = require('./routes/appealRoutes');
const profileRoutes = require('./routes/profileRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const commentRoutes = require('./routes/commentRoutes');
const profileViewRoutes = require('./routes/profileViewRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const MONGODB_URI = 'mongodb://127.0.0.1:27017/skilllaunch';

const createDefaultAdmin = async () => {
    try {
        const Admin = require('./models/Admin');
        
        const adminExists = await Admin.findOne({ email: 'admin@skilllaunch.com' });
        
        if (!adminExists) {
            console.log('Creating default admin...');
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            await Admin.create({
                fullName: 'Super Admin',
                email: 'admin@skilllaunch.com',
                password: hashedPassword, 
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
            
            console.log('Default admin created: admin@skilllaunch.com / admin123');
        } else {
            console.log('Admin already exists');
        }
        
    } catch (error) {
        console.log('Error creating default admin:', error.message);
        console.log('Error stack:', error.stack);
    }
};

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('MongoDB Connected Successfully');
        console.log(`Database: ${MONGODB_URI}`);
        
        await createDefaultAdmin();
    })
    .catch(err => {
        console.log('MongoDB Connection Failed:', err.message);
        console.log('\nTry connecting with: mongosh');
    });

app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/organizations', adminOrgRoutes);
app.use('/api/admin/content', adminContentRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/announcements', adminAnnouncementRoutes);
app.use('/api/admin/skills', adminSkillRoutes);
app.use('/api/admin/settings', adminSettingRoutes);
app.use('/api/admin/admins', adminManagementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/profile-views', profileViewRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/applications', applicationRoutes);

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