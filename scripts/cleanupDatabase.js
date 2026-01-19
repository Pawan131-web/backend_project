/**
 * Database Cleanup Script for Testing
 * Run with: node scripts/cleanupDatabase.js
 * 
 * This script will delete all users, posts, and related data
 * to provide a clean slate for testing.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Post = require('../models/Post');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skilllaunch';

async function cleanupDatabase() {
    console.log('🗑️  Database Cleanup Script');
    console.log('================================');
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Count existing data
        const userCount = await User.countDocuments();
        const postCount = await Post.countDocuments();
        
        console.log(`\n📊 Current Data:`);
        console.log(`   - Users: ${userCount}`);
        console.log(`   - Posts: ${postCount}`);
        
        if (userCount === 0 && postCount === 0) {
            console.log('\n✨ Database is already clean!');
            await mongoose.disconnect();
            return;
        }
        
        console.log('\n⚠️  WARNING: This will delete ALL data!');
        console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
        
        // Wait 5 seconds before proceeding
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🗑️  Deleting data...\n');
        
        // Delete all posts
        const deletedPosts = await Post.deleteMany({});
        console.log(`   ✅ Deleted ${deletedPosts.deletedCount} posts`);
        
        // Delete all users (except admin accounts if needed)
        const deletedUsers = await User.deleteMany({ userType: { $in: ['student', 'organization'] } });
        console.log(`   ✅ Deleted ${deletedUsers.deletedCount} users`);
        
        // Optional: Delete notifications, appeals, etc.
        try {
            const Notification = require('../models/Notification');
            const deletedNotifications = await Notification.deleteMany({});
            console.log(`   ✅ Deleted ${deletedNotifications.deletedCount} notifications`);
        } catch (e) {
            console.log('   ⚠️  Notification model not found, skipping...');
        }
        
        try {
            const Appeal = require('../models/Appeal');
            const deletedAppeals = await Appeal.deleteMany({});
            console.log(`   ✅ Deleted ${deletedAppeals.deletedCount} appeals`);
        } catch (e) {
            console.log('   ⚠️  Appeal model not found, skipping...');
        }
        
        console.log('\n✨ Database cleanup complete!');
        console.log('================================');
        console.log('You can now create fresh test accounts:');
        console.log('   - Student accounts');
        console.log('   - Organization accounts');
        console.log('\n🔄 Restart your backend server after cleanup.\n');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the cleanup
cleanupDatabase();
