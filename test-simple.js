// test-simple.js
const mongoose = require('mongoose');

console.log('🔍 Testing simple MongoDB connection...');

// Simplest possible connection
mongoose.connect('mongodb://127.0.0.1:27017/skilllaunch')
    .then(() => {
        console.log('✅ Connected!');
        console.log('Connection state:', mongoose.connection.readyState);
        console.log('1 = connected, 0 = disconnected');
        
        // Close connection
        mongoose.connection.close();
        console.log('✅ Test passed!');
    })
    .catch(error => {
        console.log('❌ Connection failed:', error.message);
        console.log('\nTrying alternative: localhost...');
        
        // Try with localhost
        mongoose.connect('mongodb://localhost:27017/skilllaunch')
            .then(() => {
                console.log('✅ Connected with localhost!');
                mongoose.connection.close();
            })
            .catch(err => {
                console.log('❌ Both failed:', err.message);
            });
    });