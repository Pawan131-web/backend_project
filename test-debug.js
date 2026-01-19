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
    console.log('=== DEBUG TEST ===\n');
    
    // Login
    console.log('1. Testing Login...');
    const loginResult = await makeRequest('POST', '/api/admin/auth/login', {
        email: 'admin@skilllaunch.com',
        password: 'admin123'
    });
    
    console.log('Login Status:', loginResult.status);
    console.log('Login Success:', loginResult.success);
    console.log('Token:', loginResult.data.token ? 'Received' : 'Not received');
    
    if (!loginResult.success) {
        console.log('Login failed, stopping tests');
        return;
    }
    
    const token = loginResult.data.token;
    console.log('\n2. Testing Organization Endpoint...');
    
    const orgResult = await makeRequest('GET', '/api/admin/organizations', null, token);
    console.log('Status:', orgResult.status);
    console.log('Success:', orgResult.success);
    console.log('Response:', JSON.stringify(orgResult.data, null, 2));
    console.log('Body:', orgResult.body);
    
    console.log('\n3. Testing Skills Endpoint...');
    const skillResult = await makeRequest('GET', '/api/admin/skills', null, token);
    console.log('Status:', skillResult.status);
    console.log('Success:', skillResult.success);
    console.log('Response:', JSON.stringify(skillResult.data, null, 2));
    
    console.log('\n4. Testing Settings Endpoint...');
    const settingResult = await makeRequest('GET', '/api/admin/settings', null, token);
    console.log('Status:', settingResult.status);
    console.log('Success:', settingResult.success);
    console.log('Response:', JSON.stringify(settingResult.data, null, 2));
}

debug().catch(console.error);
