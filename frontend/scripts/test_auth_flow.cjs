const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (_e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('--- TESTING AUTHENTICATION & PASSWORD RESET FLOWS ---');

  // Test 1: Saas Login with invalid credentials
  console.log('\n1. Testing Commercial SaaS Login with invalid password...');
  const loginRes = await postJson('/saas/auth/login', { email: 'admin@shabooagri.com', password: 'wrongpassword' });
  console.log('Response status:', loginRes.statusCode);
  console.log('Response body:', loginRes.body);

  // Test 2: Request Password Reset
  console.log('\n2. Testing Password Reset Request...');
  const resetReqRes = await postJson('/auth/password-reset/request', { email: 'owner@example.com' });
  console.log('Response status:', resetReqRes.statusCode);
  console.log('Response body:', resetReqRes.body);

  // Test 3: Business Account Registration
  console.log('\n3. Testing Commercial Business Registration API...');
  const testEmail = `test_${Date.now()}@example.com`;
  const regRes = await postJson('/saas/auth/register', {
    contactPerson: 'Test Owner',
    businessName: 'Test Agri CHC',
    phone: '9876543210',
    email: testEmail,
    password: 'Password123!',
    city: 'Ludhiana',
    state: 'Punjab'
  });
  console.log('Response status:', regRes.statusCode);
  console.log('Response body:', regRes.body);

  // Test 4: Commercial SaaS Login with newly created user
  console.log('\n4. Testing Commercial SaaS Login with newly created account...');
  const loginSuccessRes = await postJson('/saas/auth/login', { email: testEmail, password: 'Password123!' });
  console.log('Response status:', loginSuccessRes.statusCode);
  console.log('Response body:', loginSuccessRes.body);

  console.log('\n--- AUTH FLOW VERIFICATION COMPLETED ---');
})();
