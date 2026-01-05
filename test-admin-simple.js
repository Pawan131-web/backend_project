const http = require('http');

let adminToken = '';

// Helper function to make HTTP requests
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
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
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

// Test 1: Admin Login
async function testAdminLogin() {
    console.log('\n🔐 Test 1: Admin Login');
    console.log('POST /api/admin/auth/login');
    try {
        const result = await makeRequest('POST', '/api/admin/auth/login', {
            email: 'admin@skilllaunch.com',
            password: 'admin123'
        });
        
        if (result.status === 200 && result.data.success && result.data.token) {
            adminToken = result.data.token;
            console.log('✅ PASS - Admin Login Successful');
            console.log('   Token:', adminToken.substring(0, 30) + '...');
            console.log('   Admin:', result.data.admin.fullName);
            return true;
        } else {
            console.log('❌ FAIL - Status:', result.status);
            console.log('   Response:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Test 2: Get All Users (Main Fix Test)
async function testGetAllUsers() {
    console.log('\n📋 Test 2: Get All Users (MAIN FIX)');
    console.log('GET /api/admin/users');
    try {
        const result = await makeRequest('GET', '/api/admin/users', null, adminToken);
        
        if (result.status === 200 && result.data.success) {
            console.log('✅ PASS - Get All Users Successful');
            console.log('   Total Users:', result.data.total);
            console.log('   Users Returned:', result.data.count);
            console.log('   Current Page:', result.data.page);
            console.log('   Total Pages:', result.data.pages);
            return true;
        } else {
            console.log('❌ FAIL - Status:', result.status);
            console.log('   Response:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Test 3: Get User Stats
async function testGetUserStats() {
    console.log('\n📊 Test 3: Get User Stats');
    console.log('GET /api/admin/users/stats');
    try {
        const result = await makeRequest('GET', '/api/admin/users/stats', null, adminToken);
        
        if (result.status === 200 && result.data.success) {
            console.log('✅ PASS - Get User Stats Successful');
            console.log('   Total Users:', result.data.stats.total);
            console.log('   Students:', result.data.stats.students);
            console.log('   Organizations:', result.data.stats.organizations);
            console.log('   Active:', result.data.stats.active);
            console.log('   Verified:', result.data.stats.verified);
            return true;
        } else {
            console.log('❌ FAIL - Status:', result.status);
            console.log('   Response:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Test 4: Get Users with Pagination
async function testGetUsersWithPagination() {
    console.log('\n📄 Test 4: Get Users with Pagination');
    console.log('GET /api/admin/users?page=1&limit=5');
    try {
        const result = await makeRequest('GET', '/api/admin/users?page=1&limit=5', null, adminToken);
        
        if (result.status === 200 && result.data.success) {
            console.log('✅ PASS - Pagination Works');
            console.log('   Page:', result.data.page);
            console.log('   Users Returned:', result.data.count);
            console.log('   Total Pages:', result.data.pages);
            return true;
        } else {
            console.log('❌ FAIL - Status:', result.status);
            console.log('   Response:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Test 5: Test Unauthorized Access
async function testUnauthorizedAccess() {
    console.log('\n🚫 Test 5: Unauthorized Access (No Token)');
    console.log('GET /api/admin/users (without token)');
    try {
        const result = await makeRequest('GET', '/api/admin/users', null, null);
        
        if (result.status === 401) {
            console.log('✅ PASS - Unauthorized Access Blocked');
            console.log('   Message:', result.data.message);
            return true;
        } else {
            console.log('❌ FAIL - Should return 401, got:', result.status);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Test 6: Test Search Functionality
async function testSearchUsers() {
    console.log('\n🔍 Test 6: Search Users');
    console.log('GET /api/admin/users?search=admin');
    try {
        const result = await makeRequest('GET', '/api/admin/users?search=admin', null, adminToken);
        
        if (result.status === 200 && result.data.success) {
            console.log('✅ PASS - Search Works');
            console.log('   Users Found:', result.data.count);
            return true;
        } else {
            console.log('❌ FAIL - Status:', result.status);
            console.log('   Response:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAIL - Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚀 ADMIN ENDPOINTS TESTING                  ║');
    console.log('╚════════════════════════════════════════════════╝');
    
    const results = {};
    
    // Test 1: Login (required for other tests)
    results.login = await testAdminLogin();
    
    if (!results.login) {
        console.log('\n❌ Cannot proceed without admin token');
        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║   ❌ TESTS FAILED - Login Required           ║');
        console.log('╚════════════════════════════════════════════════╝');
        return;
    }
    
    // Test 2: Get All Users (MAIN FIX)
    results.getAllUsers = await testGetAllUsers();
    
    // Test 3: Get User Stats
    results.getUserStats = await testGetUserStats();
    
    // Test 4: Pagination
    results.pagination = await testGetUsersWithPagination();
    
    // Test 5: Unauthorized Access
    results.unauthorized = await testUnauthorizedAccess();
    
    // Test 6: Search
    results.search = await testSearchUsers();
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   📊 TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('1. Admin Login:          ', results.login ? '✅ PASS' : '❌ FAIL');
    console.log('2. Get All Users:        ', results.getAllUsers ? '✅ PASS' : '❌ FAIL');
    console.log('3. Get User Stats:       ', results.getUserStats ? '✅ PASS' : '❌ FAIL');
    console.log('4. Pagination:           ', results.pagination ? '✅ PASS' : '❌ FAIL');
    console.log('5. Unauthorized Access:  ', results.unauthorized ? '✅ PASS' : '❌ FAIL');
    console.log('6. Search Users:         ', results.search ? '✅ PASS' : '❌ FAIL');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;
    
    console.log('\n╔════════════════════════════════════════════════╗');
    if (passedTests === totalTests) {
        console.log('║   ✅ ALL TESTS PASSED: ' + passedTests + '/' + totalTests + '                    ║');
    } else {
        console.log('║   ⚠️  TESTS PASSED: ' + passedTests + '/' + totalTests + '                       ║');
    }
    console.log('╚════════════════════════════════════════════════╝');
}

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Test execution error:', error);
});
