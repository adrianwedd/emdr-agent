const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function testAPI() {
  console.log('🧪 Testing EMDR API endpoints...\n');

  try {
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data.status);
    console.log('   Database:', healthResponse.data.services?.database?.status);
    console.log('');

    // Test user registration
    console.log('2. Testing user registration...');
    const registerData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResponse = await axios.post(`${API_BASE}/api/auth/register`, registerData);
    console.log('✅ User registered successfully');
    console.log('   Full response:', JSON.stringify(registerResponse.data, null, 2));
    console.log('');

    const { accessToken } = registerResponse.data.data.tokens;

    // Test user profile
    console.log('3. Testing user profile...');
    const profileResponse = await axios.get(`${API_BASE}/api/users/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Profile retrieved successfully');
    console.log('   Profile data:', JSON.stringify(profileResponse.data, null, 2));
    console.log('');

    // Test user login
    console.log('4. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });
    console.log('✅ User logged in successfully');
    console.log('   Access token valid:', !!loginResponse.data.data.tokens.accessToken);
    console.log('   Refresh token valid:', !!loginResponse.data.data.tokens.refreshToken);
    console.log('');

    // Test safety check
    console.log('5. Testing safety check...');
    const safetyResponse = await axios.post(`${API_BASE}/api/safety/check`, {
      sessionId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      sudLevel: 5,
      measurements: {
        physiological: { heartRate: 80, bloodPressure: '120/80' },
        psychological: { anxiety: 5, mood: 6 }
      }
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Safety check completed');
    console.log('   Risk level:', safetyResponse.data.riskLevel);
    console.log('');

    // Test grounding techniques
    console.log('6. Testing grounding techniques...');
    const groundingResponse = await axios.get(`${API_BASE}/api/safety/grounding-techniques`, {
      params: { category: 'breathing' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Grounding techniques retrieved');
    console.log('   Number of techniques:', groundingResponse.data.length);
    console.log('');

    console.log('🎉 All API tests passed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      endpoint: error.config?.url
    });
    
    if (error.response?.data?.details) {
      console.error('   Details:', error.response.data.details);
    }
  }
}

// Run tests
testAPI();