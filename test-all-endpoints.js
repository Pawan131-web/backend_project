const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let adminToken = '';

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.yellow}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`)
};

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    errors: []
};

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status 
        };
    }
}

// Test function
async function test(name, testFn) {
    try {
        await testFn();
        results.passed++;
        log.success(name);
    } catch (error) {
        results.failed++;
        results.errors.push({ test: name, error: error.message });
        log.error(`${name}: ${error.message}`);
    }
}

// Main test suite
async function runTests() {
    log.section('STARTING COMPREHENSIVE API TESTING');
    
    // ===== AUTHENTICATION =====
    log.section('MODULE 0: AUTHENTICATION');
    
    await test('Admin Login', async () => {
        const result = await makeRequest('POST', '/api/admin/auth/login', {
            email: 'admin@skilllaunch.com',
            password: 'admin123'
        });
        
        if (!result.success || !result.data.token) {
            throw new Error('Login failed or no token received');
        }
        
        adminToken = result.data.token;
        log.info(`Token received: ${adminToken.substring(0, 20)}...`);
    });
    
    await test('Invalid Login Credentials', async () => {
        const result = await makeRequest('POST', '/api/admin/auth/login', {
            email: 'wrong@email.com',
            password: 'wrongpass'
        });
        
        if (result.success) {
            throw new Error('Should have failed with invalid credentials');
        }
    });
    
    // ===== MODULE 1: ORGANIZATION MANAGEMENT =====
    log.section('MODULE 1: ORGANIZATION MANAGEMENT API');
    
    await test('Get All Organizations', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Organizations with Pagination', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations?page=1&limit=5', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Pending Organizations', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations/pending', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Organization Statistics', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations/stats', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.stats) throw new Error('No stats returned');
    });
    
    await test('Get Organizations - Unauthorized (no token)', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations');
        if (result.success) throw new Error('Should require authentication');
    });
    
    // ===== MODULE 2: CONTENT MODERATION =====
    log.section('MODULE 2: CONTENT MODERATION API');
    
    await test('Get All Posts', async () => {
        const result = await makeRequest('GET', '/api/admin/content/posts', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Posts with Filters', async () => {
        const result = await makeRequest('GET', '/api/admin/content/posts?status=active&type=internship', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get All Reports', async () => {
        const result = await makeRequest('GET', '/api/admin/content/reports', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Reports with Filters', async () => {
        const result = await makeRequest('GET', '/api/admin/content/reports?status=pending&priority=high', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Content Statistics', async () => {
        const result = await makeRequest('GET', '/api/admin/content/stats', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.stats) throw new Error('No stats returned');
    });
    
    // ===== MODULE 3: ANALYTICS & DASHBOARD =====
    log.section('MODULE 3: ANALYTICS & DASHBOARD API');
    
    await test('Get Platform Overview', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/overview', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.overview) throw new Error('No overview data returned');
    });
    
    await test('Get User Growth Data (30 days)', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/growth?days=30', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.data) throw new Error('No growth data returned');
    });
    
    await test('Get User Growth Data (7 days)', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/growth?days=7', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Engagement Metrics', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/engagement', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.engagement) throw new Error('No engagement data returned');
    });
    
    await test('Get Activity Logs', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/activity-logs', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Activity Logs with Filters', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/activity-logs?page=1&limit=10', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    // ===== MODULE 4: ANNOUNCEMENTS =====
    log.section('MODULE 4: ANNOUNCEMENTS SYSTEM API');
    
    let announcementId = null;
    
    await test('Get All Announcements', async () => {
        const result = await makeRequest('GET', '/api/admin/announcements', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Create Announcement', async () => {
        const result = await makeRequest('POST', '/api/admin/announcements', {
            title: 'Test Announcement',
            message: 'This is a test announcement for API testing',
            type: 'info',
            target: 'all',
            priority: 'medium'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.announcement) throw new Error('No announcement returned');
        
        announcementId = result.data.announcement.id;
        log.info(`Created announcement ID: ${announcementId}`);
    });
    
    await test('Get Single Announcement', async () => {
        if (!announcementId) throw new Error('No announcement ID available');
        
        const result = await makeRequest('GET', `/api/admin/announcements/${announcementId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Announcement', async () => {
        if (!announcementId) throw new Error('No announcement ID available');
        
        const result = await makeRequest('PUT', `/api/admin/announcements/${announcementId}`, {
            title: 'Updated Test Announcement',
            priority: 'high'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Announcement Statistics', async () => {
        const result = await makeRequest('GET', '/api/admin/announcements/stats', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.stats) throw new Error('No stats returned');
    });
    
    await test('Delete Announcement', async () => {
        if (!announcementId) throw new Error('No announcement ID available');
        
        const result = await makeRequest('DELETE', `/api/admin/announcements/${announcementId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    // ===== MODULE 5: SKILLS MANAGEMENT =====
    log.section('MODULE 5: SKILLS MANAGEMENT API');
    
    let skillId = null;
    
    await test('Get All Skills', async () => {
        const result = await makeRequest('GET', '/api/admin/skills', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Skills with Filters', async () => {
        const result = await makeRequest('GET', '/api/admin/skills?category=Programming&status=active', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Skill Categories', async () => {
        const result = await makeRequest('GET', '/api/admin/skills/categories', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Create Skill', async () => {
        const result = await makeRequest('POST', '/api/admin/skills', {
            name: 'Test Skill - JavaScript',
            category: 'Programming',
            description: 'Testing skill creation'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.skill) throw new Error('No skill returned');
        
        skillId = result.data.skill.id;
        log.info(`Created skill ID: ${skillId}`);
    });
    
    await test('Get Single Skill', async () => {
        if (!skillId) throw new Error('No skill ID available');
        
        const result = await makeRequest('GET', `/api/admin/skills/${skillId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Skill', async () => {
        if (!skillId) throw new Error('No skill ID available');
        
        const result = await makeRequest('PUT', `/api/admin/skills/${skillId}`, {
            description: 'Updated description for testing'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Bulk Add Skills', async () => {
        const result = await makeRequest('POST', '/api/admin/skills/bulk', {
            skills: [
                { name: 'Test Skill - Python', category: 'Programming', description: 'Bulk test 1' },
                { name: 'Test Skill - React', category: 'Web Development', description: 'Bulk test 2' }
            ]
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Skill Statistics', async () => {
        const result = await makeRequest('GET', '/api/admin/skills/stats', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.stats) throw new Error('No stats returned');
    });
    
    await test('Delete Skill', async () => {
        if (!skillId) throw new Error('No skill ID available');
        
        const result = await makeRequest('DELETE', `/api/admin/skills/${skillId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    // ===== MODULE 6: PLATFORM SETTINGS =====
    log.section('MODULE 6: PLATFORM SETTINGS API');
    
    await test('Initialize Default Settings', async () => {
        const result = await makeRequest('POST', '/api/admin/settings/initialize', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get All Settings', async () => {
        const result = await makeRequest('GET', '/api/admin/settings', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.settings) throw new Error('No settings returned');
    });
    
    await test('Get Settings by Category', async () => {
        const result = await makeRequest('GET', '/api/admin/settings?category=general', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Single Setting', async () => {
        const result = await makeRequest('GET', '/api/admin/settings/platform_name', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Single Setting', async () => {
        const result = await makeRequest('PUT', '/api/admin/settings/platform_name', {
            value: 'SkillLaunch Platform'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Multiple Settings', async () => {
        const result = await makeRequest('PUT', '/api/admin/settings', {
            settings: {
                'platform_tagline': 'Connect. Learn. Grow Together.',
                'registration_enabled': true
            }
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get System Health', async () => {
        const result = await makeRequest('GET', '/api/admin/system/health', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.health) throw new Error('No health data returned');
    });
    
    // ===== MODULE 7: ADMIN MANAGEMENT =====
    log.section('MODULE 7: ADMIN MANAGEMENT API');
    
    let newAdminId = null;
    
    await test('Get All Admins', async () => {
        const result = await makeRequest('GET', '/api/admin/admins', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Admins with Filters', async () => {
        const result = await makeRequest('GET', '/api/admin/admins?role=super_admin&status=active', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Create New Admin', async () => {
        const result = await makeRequest('POST', '/api/admin/admins', {
            fullName: 'Test Admin',
            email: 'testadmin@skilllaunch.com',
            password: 'testpass123',
            role: 'admin'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.admin) throw new Error('No admin returned');
        
        newAdminId = result.data.admin.id;
        log.info(`Created admin ID: ${newAdminId}`);
    });
    
    await test('Get Single Admin', async () => {
        if (!newAdminId) throw new Error('No admin ID available');
        
        const result = await makeRequest('GET', `/api/admin/admins/${newAdminId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Admin', async () => {
        if (!newAdminId) throw new Error('No admin ID available');
        
        const result = await makeRequest('PUT', `/api/admin/admins/${newAdminId}`, {
            fullName: 'Updated Test Admin'
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Update Admin Permissions', async () => {
        if (!newAdminId) throw new Error('No admin ID available');
        
        const result = await makeRequest('PUT', `/api/admin/admins/${newAdminId}/permissions`, {
            permissions: {
                manageUsers: true,
                manageOrgs: false,
                manageContent: true
            }
        }, adminToken);
        
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    await test('Get Admin Statistics', async () => {
        const result = await makeRequest('GET', '/api/admin/admins/stats', null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
        if (!result.data.stats) throw new Error('No stats returned');
    });
    
    await test('Delete Admin', async () => {
        if (!newAdminId) throw new Error('No admin ID available');
        
        const result = await makeRequest('DELETE', `/api/admin/admins/${newAdminId}`, null, adminToken);
        if (!result.success) throw new Error(result.error.message || 'Failed');
    });
    
    // ===== FINAL RESULTS =====
    log.section('TEST RESULTS SUMMARY');
    
    console.log(`\n${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`${colors.blue}Total: ${results.passed + results.failed}${colors.reset}`);
    
    if (results.errors.length > 0) {
        console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
        results.errors.forEach((err, index) => {
            console.log(`${index + 1}. ${err.test}: ${err.error}`);
        });
    }
    
    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(2);
    console.log(`\n${colors.yellow}Success Rate: ${successRate}%${colors.reset}\n`);
    
    if (results.failed === 0) {
        log.success('ALL TESTS PASSED! 🎉');
    } else {
        log.error(`${results.failed} tests failed. Please review the errors above.`);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
