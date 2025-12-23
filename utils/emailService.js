const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // For local testing
    }
});

// Test email connection
transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Email server connection error:', error.message);
        console.log('💡 Using simulated email instead...');
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

const sendVerificationEmail = async (email, verificationCode) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'SkillLaunch <noreply@skilllaunch.com>',
            to: email,
            subject: 'Verify Your SkillLaunch Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #D32F2F;">Welcome to SkillLaunch! 🚀</h2>
                    <p>Thank you for registering with SkillLaunch.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <h3 style="margin: 0; color: #333;">Your Verification Code</h3>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #D32F2F; margin: 15px 0;">
                            ${verificationCode}
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            This code will expire in 10 minutes
                        </p>
                    </div>
                    
                    <p>Enter this code on the verification page to activate your account.</p>
                    <p>If you didn't create an account, please ignore this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        This is an automated message from SkillLaunch. Please do not reply.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent to:', email);
        console.log('📧 Message ID:', info.messageId);
        return true;
        
    } catch (error) {
        console.log('❌ Email sending failed:', error.message);
        console.log('📝 Falling back to simulated email...');
        
        // Fallback to simulated email
        console.log('\n📧 ===== SIMULATED EMAIL (Fallback) =====');
        console.log(`To: ${email}`);
        console.log(`Verification Code: ${verificationCode}`);
        console.log('📧 ===== END EMAIL =====\n');
        
        return false;
    }
};

const sendPasswordResetEmail = async (email, resetToken) => {
    // Similar implementation for password reset
    console.log('Password reset email would be sent to:', email);
    return true;
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};