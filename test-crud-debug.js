const http = require('http');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
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
                        status: res.statusCode,
                        body: body
                    });
                } catch (e) {
                    resolve({ 
                        success: false, 
                        error: 'Invalid JSON', 
                        status: res.statusCode,
                        body: body
                    });
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

async function debug() {
    console.log('=== CRUD DEBUG TEST ===\n');
    
    // Login
    console.log('1. Login...');
    const loginResult = await makeRequest('POST', '/api/admin/auth/login', {
        email: 'admin@skilllaunch.com',
        password: 'admin123'
    });
    
    if (!loginResult.success) {
        console.log('Login failed');
        return;
    }
    
    const token = loginResult.data.token;
    console.log('✓ Login successful\n');
    
    // Test Create Announcement
    console.log('2. Testing Create Announcement...');
    const announcementData = {
        title: 'Test Announcement',
        message: 'Testing API',
        type: 'info',
        target: 'all',
        priority: 'medium'
    };
    console.log('Data:', JSON.stringify(announcementData, null, 2));
    
    const announcementResult = await makeRequest('POST', '/api/admin/announcements', announcementData, token);
    console.log('Status:', announcementResult.status);
    console.log('Success:', announcementResult.success);
    console.log('Response:', JSON.stringify(announcementResult.data, null, 2));
    console.log('');
    
    // Test Create Skill
    console.log('3. Testing Create Skill...');
    const skillData = {
        name: 'JavaScript Testing',
        category: 'Programming',
        description: 'Test skill'
    };
    console.log('Data:', JSON.stringify(skillData, null, 2));
    
    const skillResult = await makeRequest('POST', '/api/admin/skills', skillData, token);
    console.log('Status:', skillResult.status);
    console.log('Success:', skillResult.success);
    console.log('Response:', JSON.stringify(skillResult.data, null, 2));
    console.log('');
    
    // Test Initialize Settings
    console.log('4. Testing Initialize Settings...');
    const settingsResult = await makeRequest('POST', '/api/admin/settings/initialize', null, token);
    console.log('Status:', settingsResult.status);
    console.log('Success:', settingsResult.success);
    console.log('Response:', JSON.stringify(settingsResult.data, null, 2));
    console.log('');
    
    // Test Get Single Setting
    console.log('5. Testing Get Single Setting...');
    const singleSettingResult = await makeRequest('GET', '/api/admin/settings/platform_name', null, token);
    console.log('Status:', singleSettingResult.status);
    console.log('Success:', singleSettingResult.success);
    console.log('Response:', JSON.stringify(singleSettingResult.data, null, 2));
    console.log('');
    
    // Test System Health
    console.log('6. Testing System Health...');
    const healthResult = await makeRequest('GET', '/api/admin/system/health', null, token);
    console.log('Status:', healthResult.status);
    console.log('Success:', healthResult.success);
    console.log('Response:', JSON.stringify(healthResult.data, null, 2));
}

debug().catch(console.error);
