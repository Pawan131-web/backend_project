const emailService = require('./utils/emailService');

console.log('📧 Testing email service...');

async function testEmail() {
    try {
        const result = await emailService.sendVerificationEmail(
            'test-receiver@example.com',  // Any email address (can be fake)
            '123456'                       // Test code
        );
        
        if (result) {
            console.log('✅ Email test completed');
        } else {
            console.log('⚠️ Email sent in simulation mode');
        }
    } catch (error) {
        console.log('❌ Email test failed:', error.message);
    }
}

testEmail();