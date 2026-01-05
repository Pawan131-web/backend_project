const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let adminToken = '';

// Test 1: Admin Login
async function testAdminLogin() {
    console.log('\n🔐 Testing Admin Login...');
    try {
        const response = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
            email: 'admin@skilllaunch.com',
            password: 'admin123'
        });
        
        if (response.data.success && response.data.token) {
            adminToken = response.data.token;
            console.log('✅ Admin Login Successful');
            console.log('Token:', adminToken.substring(0, 20) + '...');
            return true;
        }
    } catch (error) {
        console.log('❌ Admin Login Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 2: Get All Users
async function testGetAllUsers() {
    console.log('\n📋 Testing GET /api/admin/users...');
    try {
        const response = await axios.get(`${BASE_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        console.log('✅ Get All Users Successful');
        console.log('Total Users:', response.data.total);
        console.log('Users Count:', response.data.count);
        console.log('Current Page:', response.data.page);
        return true;
    } catch (error) {
        console.log('❌ Get All Users Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 3: Get User Stats
async function testGetUserStats() {
    console.log('\n📊 Testing GET /api/admin/users/stats...');
    try {
        const response = await axios.get(`${BASE_URL}/api/admin/users/stats`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        console.log('✅ Get User Stats Successful');
        console.log('Stats:', JSON.stringify(response.data.stats, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Get User Stats Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 4: Get All Users with Pagination
async function testGetUsersWithPagination() {
    console.log('\n📄 Testing GET /api/admin/users with pagination...');
    try {
        const response = await axios.get(`${BASE_URL}/api/admin/users?page=1&limit=5`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        console.log('✅ Get Users with Pagination Successful');
        console.log('Page:', response.data.page);
        console.log('Limit:', 5);
        console.log('Users Returned:', response.data.count);
        return true;
    } catch (error) {
        console.log('❌ Get Users with Pagination Failed:', error.response?.data || error.message);
        return false;
    }
}

// Test 5: Test without Authorization
async function testUnauthorizedAccess() {
    console.log('\n🚫 Testing Unauthorized Access...');
    try {
        await axios.get(`${BASE_URL}/api/admin/users`);
        console.log('❌ Should have failed but succeeded');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Unauthorized Access Blocked Correctly');
            console.log('Message:', error.response.data.message);
            return true;
        }
        console.log('❌ Unexpected error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Admin Endpoints Testing...');
    console.log('='.repeat(50));
    
    const results = {
        adminLogin: false,
        getAllUsers: false,
        getUserStats: false,
        pagination: false,
        unauthorized: false
    };
    
    // Test 1: Login (required for other tests)
    results.adminLogin = await testAdminLogin();
    
    if (!results.adminLogin) {
        console.log('\n❌ Cannot proceed without admin token');
        return;
    }
    
    // Test 2: Get All Users
    results.getAllUsers = await testGetAllUsers();
    
    // Test 3: Get User Stats
    results.getUserStats = await testGetUserStats();
    
    // Test 4: Pagination
    results.pagination = await testGetUsersWithPagination();
    
    // Test 5: Unauthorized Access
    results.unauthorized = await testUnauthorizedAccess();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('Admin Login:', results.adminLogin ? '✅ PASS' : '❌ FAIL');
    console.log('Get All Users:', results.getAllUsers ? '✅ PASS' : '❌ FAIL');
    console.log('Get User Stats:', results.getUserStats ? '✅ PASS' : '❌ FAIL');
    console.log('Pagination:', results.pagination ? '✅ PASS' : '❌ FAIL');
    console.log('Unauthorized Access:', results.unauthorized ? '✅ PASS' : '❌ FAIL');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`TOTAL: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(50));
}

// Run tests
runAllTests().catch(error => {
    console.error('Test execution error:', error);
});
