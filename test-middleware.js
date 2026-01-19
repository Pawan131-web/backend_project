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
                console.log('Raw body:', body);
                try {
                    const parsed = JSON.parse(body);
                    resolve({ 
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        data: parsed,
                        status: res.statusCode
                    });
                } catch (e) {
                    resolve({ 
                        success: false, 
                        error: 'Parse error', 
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

async function test() {
    // Login
    const loginResult = await makeRequest('POST', '/api/admin/auth/login', {
        email: 'admin@skilllaunch.com',
        password: 'admin123'
    });
    
    const token = loginResult.data.token;
    console.log('Token received\n');
    
    // Test announcement creation with detailed logging
    console.log('Testing POST /api/admin/announcements');
    console.log('Token:', token.substring(0, 30) + '...');
    console.log('Data:', JSON.stringify({
        title: 'Test',
        message: 'Test message',
        type: 'info',
        target: 'all',
        priority: 'medium'
    }, null, 2));
    
    const result = await makeRequest('POST', '/api/admin/announcements', {
        title: 'Test',
        message: 'Test message',
        type: 'info',
        target: 'all',
        priority: 'medium'
    }, token);
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
