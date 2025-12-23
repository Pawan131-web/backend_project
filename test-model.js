const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/skilllaunch')
    .then(async () => {
        console.log('✅ MongoDB Connected');
        
        // Import User model
        const User = require('./models/User');
        
        // Test creating a user directly
        console.log('\n🔍 Testing User.create() directly...');
        
        try {
            const testUser = await User.create({
                fullName: 'Direct Test',
                email: 'direct@test.com',
                password: 'direct123',
                userType: 'student'
            });
            
            console.log('✅ User created');
            console.log('Password in DB:', testUser.password);
            
            // Check if password is hashed
            if (testUser.password.startsWith('$2')) {
                console.log('🎉 Password is HASHED!');
            } else {
                console.log('❌ Password is NOT hashed');
                console.log('Password value:', testUser.password);
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
        
        mongoose.connection.close();
    })
    .catch(err => {
        console.log('❌ MongoDB error:', err.message);
    });