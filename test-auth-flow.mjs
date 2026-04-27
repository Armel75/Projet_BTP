import http from 'http';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          // console.log("RESPONDED STATUS", res.statusCode, body)
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  const HOST = 'localhost';
  const PORT = 3000;

  console.log("1. Registering admin and normal user...");
  // User 1
  const rAdmin = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    firstname: "Admin", lastname: "User", email: "admin@test.com", username: "admin", 
    password: "123", matricule: "A1", roleCode: "ADMIN"
  }));
  console.log("rAdmin status:", rAdmin.status, "data:", rAdmin.data);
  let adminToken = rAdmin.data?.token;

  if (!adminToken) {
    const loginReq = await makeRequest({
        hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify({ email: "admin@test.com", password: "123" }));
      console.log("loginReq admin:", loginReq.status, loginReq.data);
      adminToken = loginReq.data?.token;
  }

  // User 2
  const rNormal = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    firstname: "Norm", lastname: "User", email: "norm@test.com", username: "norm", 
    password: "123", matricule: "A2", roleCode: "CHEF_PROJET"
  }));
  let normToken = rNormal.data?.token;

    if (!normToken) {
    const loginReq2 = await makeRequest({
        hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, JSON.stringify({ email: "norm@test.com", password: "123" }));
      normToken = loginReq2.data?.token;
  }

  console.log("Admin token:", !!adminToken, "Norm token:", !!normToken);

  console.log("\n2. Normal user requesting RBAC roles (should be forbidden)");
  const qNormal = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/rbac/roles', method: 'GET',
    headers: { 'Authorization': `Bearer ${normToken}` }
  });
  console.log("Normal user RBAC status:", qNormal.status); // Expect 403

  console.log("\n3. Admin user requesting RBAC roles (should be allowed)");
  const qAdmin = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/rbac/roles', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log("Admin user RBAC status:", qAdmin.status); // Expect 200

  console.log("\n4. Logging out Admin...");
  const qLogout = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/auth/logout', method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log("Logout status:", qLogout.status); // Expect 200

  console.log("\n5. Admin requesting RBAC after logout (should be unauthorized)");
  const qAdminAfter = await makeRequest({
    hostname: HOST, port: PORT, path: '/api/rbac/roles', method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log("Admin after logout status:", qAdminAfter.status); // Expect 401

})();
