const http = require('http');

const BASE_URL = 'localhost';
const PORT = 5000;
let adminToken = '';

// Color codes
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

// Test results
const results = { passed: 0, failed: 0, errors: [] };

// HTTP request helper
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ 
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        data: parsed,
                        status: res.statusCode
                    });
                } catch (e) {
                    resolve({ success: false, error: 'Invalid JSON', status: res.statusCode });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test wrapper
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
    log.section('COMPREHENSIVE API TESTING - SkillLaunch Admin Backend');
    
    // ===== AUTHENTICATION =====
    log.section('MODULE 0: AUTHENTICATION');
    
    await test('Admin Login', async () => {
        const result = await makeRequest('POST', '/api/admin/auth/login', {
            email: 'admin@skilllaunch.com',
            password: 'admin123'
        });
        
        if (!result.success || !result.data.token) {
            throw new Error('Login failed');
        }
        
        adminToken = result.data.token;
        log.info(`Token: ${adminToken.substring(0, 30)}...`);
    });
    
    await test('Invalid Login', async () => {
        const result = await makeRequest('POST', '/api/admin/auth/login', {
            email: 'wrong@email.com',
            password: 'wrong'
        });
        
        if (result.success) {
            throw new Error('Should fail with invalid credentials');
        }
    });
    
    // ===== MODULE 1: ORGANIZATIONS =====
    log.section('MODULE 1: ORGANIZATION MANAGEMENT');
    
    await test('Get All Organizations', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations', null, adminToken);
        if (!result.success) throw new Error('Failed to get organizations');
    });
    
    await test('Get Pending Organizations', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations/pending', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Organization Stats', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations/stats', null, adminToken);
        if (!result.success || !result.data.stats) throw new Error('Failed');
    });
    
    await test('Unauthorized Access (no token)', async () => {
        const result = await makeRequest('GET', '/api/admin/organizations');
        if (result.success) throw new Error('Should require auth');
    });
    
    // ===== MODULE 2: CONTENT MODERATION =====
    log.section('MODULE 2: CONTENT MODERATION');
    
    await test('Get All Posts', async () => {
        const result = await makeRequest('GET', '/api/admin/content/posts', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get All Reports', async () => {
        const result = await makeRequest('GET', '/api/admin/content/reports', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Content Stats', async () => {
        const result = await makeRequest('GET', '/api/admin/content/stats', null, adminToken);
        if (!result.success || !result.data.stats) throw new Error('Failed');
    });
    
    // ===== MODULE 3: ANALYTICS =====
    log.section('MODULE 3: ANALYTICS & DASHBOARD');
    
    await test('Get Platform Overview', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/overview', null, adminToken);
        if (!result.success || !result.data.overview) throw new Error('Failed');
    });
    
    await test('Get User Growth (30 days)', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/growth?days=30', null, adminToken);
        if (!result.success || !result.data.data) throw new Error('Failed');
    });
    
    await test('Get Engagement Metrics', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/engagement', null, adminToken);
        if (!result.success || !result.data.engagement) throw new Error('Failed');
    });
    
    await test('Get Activity Logs', async () => {
        const result = await makeRequest('GET', '/api/admin/analytics/activity-logs', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    // ===== MODULE 4: ANNOUNCEMENTS =====
    log.section('MODULE 4: ANNOUNCEMENTS');
    
    let announcementId = null;
    
    await test('Get All Announcements', async () => {
        const result = await makeRequest('GET', '/api/admin/announcements', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Create Announcement', async () => {
        const result = await makeRequest('POST', '/api/admin/announcements', {
            title: 'Test Announcement',
            message: 'Testing API',
            type: 'info',
            target: 'all',
            priority: 'medium'
        }, adminToken);
        
        if (!result.success || !result.data.announcement) throw new Error('Failed');
        announcementId = result.data.announcement.id;
        log.info(`Created: ${announcementId}`);
    });
    
    await test('Get Single Announcement', async () => {
        if (!announcementId) throw new Error('No ID');
        const result = await makeRequest('GET', `/api/admin/announcements/${announcementId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Announcement', async () => {
        if (!announcementId) throw new Error('No ID');
        const result = await makeRequest('PUT', `/api/admin/announcements/${announcementId}`, {
            title: 'Updated Announcement'
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Announcement Stats', async () => {
        const result = await makeRequest('GET', '/api/admin/announcements/stats', null, adminToken);
        if (!result.success || !result.data.stats) throw new Error('Failed');
    });
    
    await test('Delete Announcement', async () => {
        if (!announcementId) throw new Error('No ID');
        const result = await makeRequest('DELETE', `/api/admin/announcements/${announcementId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    // ===== MODULE 5: SKILLS =====
    log.section('MODULE 5: SKILLS MANAGEMENT');
    
    let skillId = null;
    
    await test('Get All Skills', async () => {
        const result = await makeRequest('GET', '/api/admin/skills', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Skill Categories', async () => {
        const result = await makeRequest('GET', '/api/admin/skills/categories', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Create Skill', async () => {
        const result = await makeRequest('POST', '/api/admin/skills', {
            name: 'JavaScript Testing',
            category: 'Programming',
            description: 'Test skill'
        }, adminToken);
        
        if (!result.success || !result.data.skill) throw new Error('Failed');
        skillId = result.data.skill.id;
        log.info(`Created: ${skillId}`);
    });
    
    await test('Get Single Skill', async () => {
        if (!skillId) throw new Error('No ID');
        const result = await makeRequest('GET', `/api/admin/skills/${skillId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Skill', async () => {
        if (!skillId) throw new Error('No ID');
        const result = await makeRequest('PUT', `/api/admin/skills/${skillId}`, {
            description: 'Updated'
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Bulk Add Skills', async () => {
        const result = await makeRequest('POST', '/api/admin/skills/bulk', {
            skills: [
                { name: 'Python', category: 'Programming', description: 'Test' },
                { name: 'React', category: 'Web', description: 'Test' }
            ]
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Skill Stats', async () => {
        const result = await makeRequest('GET', '/api/admin/skills/stats', null, adminToken);
        if (!result.success || !result.data.stats) throw new Error('Failed');
    });
    
    await test('Delete Skill', async () => {
        if (!skillId) throw new Error('No ID');
        const result = await makeRequest('DELETE', `/api/admin/skills/${skillId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    // ===== MODULE 6: SETTINGS =====
    log.section('MODULE 6: PLATFORM SETTINGS');
    
    await test('Initialize Settings', async () => {
        const result = await makeRequest('POST', '/api/admin/settings/initialize', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get All Settings', async () => {
        const result = await makeRequest('GET', '/api/admin/settings', null, adminToken);
        if (!result.success || !result.data.settings) throw new Error('Failed');
    });
    
    await test('Get Single Setting', async () => {
        const result = await makeRequest('GET', '/api/admin/settings/platform_name', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Setting', async () => {
        const result = await makeRequest('PUT', '/api/admin/settings/platform_name', {
            value: 'SkillLaunch'
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Multiple Settings', async () => {
        const result = await makeRequest('PUT', '/api/admin/settings', {
            settings: {
                'platform_tagline': 'Test',
                'registration_enabled': true
            }
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get System Health', async () => {
        const result = await makeRequest('GET', '/api/admin/settings/system/health', null, adminToken);
        if (!result.success || !result.data.health) throw new Error('Failed');
    });
    
    // ===== MODULE 7: ADMIN MANAGEMENT =====
    log.section('MODULE 7: ADMIN MANAGEMENT');
    
    let newAdminId = null;
    
    await test('Get All Admins', async () => {
        const result = await makeRequest('GET', '/api/admin/admins', null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Create Admin', async () => {
        const result = await makeRequest('POST', '/api/admin/admins', {
            fullName: 'Test Admin',
            email: 'testadmin@test.com',
            password: 'test123',
            role: 'admin'
        }, adminToken);
        
        if (!result.success || !result.data.admin) throw new Error('Failed');
        newAdminId = result.data.admin.id;
        log.info(`Created: ${newAdminId}`);
    });
    
    await test('Get Single Admin', async () => {
        if (!newAdminId) throw new Error('No ID');
        const result = await makeRequest('GET', `/api/admin/admins/${newAdminId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Admin', async () => {
        if (!newAdminId) throw new Error('No ID');
        const result = await makeRequest('PUT', `/api/admin/admins/${newAdminId}`, {
            fullName: 'Updated Admin'
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Update Permissions', async () => {
        if (!newAdminId) throw new Error('No ID');
        const result = await makeRequest('PUT', `/api/admin/admins/${newAdminId}/permissions`, {
            permissions: { manageUsers: true, manageOrgs: false }
        }, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    await test('Get Admin Stats', async () => {
        const result = await makeRequest('GET', '/api/admin/admins/stats', null, adminToken);
        if (!result.success || !result.data.stats) throw new Error('Failed');
    });
    
    await test('Delete Admin', async () => {
        if (!newAdminId) throw new Error('No ID');
        const result = await makeRequest('DELETE', `/api/admin/admins/${newAdminId}`, null, adminToken);
        if (!result.success) throw new Error('Failed');
    });
    
    // ===== RESULTS =====
    log.section('TEST RESULTS');
    
    console.log(`\n${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
    console.log(`${colors.blue}Total Tests: ${results.passed + results.failed}${colors.reset}`);
    
    if (results.errors.length > 0) {
        console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
        results.errors.forEach((err, i) => {
            console.log(`${i + 1}. ${err.test}: ${err.error}`);
        });
    }
    
    const rate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(2);
    console.log(`\n${colors.yellow}Success Rate: ${rate}%${colors.reset}\n`);
    
    if (results.failed === 0) {
        log.success('🎉 ALL TESTS PASSED!');
    }
}

// Run tests
runTests().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
