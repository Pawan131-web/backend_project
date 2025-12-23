const bcrypt = require('bcryptjs');

console.log('Testing bcrypt directly...');

async function testBcrypt() {
    try {
        const password = 'test123';
        console.log('Original password:', password);
        
        const salt = await bcrypt.genSalt(10);
        console.log('Salt generated');
        
        const hash = await bcrypt.hash(password, salt);
        console.log('Hashed password:', hash);
        
        // Test comparison
        const match = await bcrypt.compare('test123', hash);
        console.log('Password matches?', match);
        
        console.log('✅ Bcrypt is working!');
    } catch (error) {
        console.log('❌ Bcrypt error:', error);
    }
}

testBcrypt();