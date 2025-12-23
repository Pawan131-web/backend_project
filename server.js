const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors'); 
const app = express();
app.use(express.json());

// Correct MongoDB connection for newer versions
const MONGODB_URI = 'mongodb://127.0.0.1:27017/skilllaunch';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📊 Database: ${MONGODB_URI}`);
        
        // Check connection status
        const db = mongoose.connection.db;
        console.log(`📁 Database name: ${db.databaseName}`);
    })
    .catch(err => {
        console.log('❌ MongoDB Connection Failed:', err.message);
        console.log('\n💡 Try connecting with: mongosh');
    });


app.use(cors());
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);

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
            login: 'POST /api/auth/login'
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
    console.log('   GET  /test');
});