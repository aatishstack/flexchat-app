// Force testing mode and dummy config before imports to bypass static ESM initialization order
process.env.TESTING = "true";
process.env.JWT_SECRET = "test-secret-must-be-at-least-32-characters";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://user:password@localhost:5432/flexchat?sslmode=require";
process.env.TURNSTILE_SECRET_KEY = "";

const { buildApp } = await import("../app.js");

async function runTests() {
  console.log("=== STARTING AUTH ROUTE VERIFICATION TESTS ===");
  const app = await buildApp();
  await app.ready();

  let testUser = {
    username: "testuser",
    email: "testuser@example.com",
    password: "Password123",
  };

  let registeredToken: string = "";
  let registeredRefreshToken: string = "";
  let userId: string = "";

  // 1. VERIFY REGISTER
  console.log("\n--- Testing Registration Flow ---");
  const regResponse = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: testUser,
  });

  console.log("Register response status:", regResponse.statusCode);
  const regData = JSON.parse(regResponse.payload);
  if (regResponse.statusCode !== 200) {
    throw new Error(`Registration failed: ${regResponse.payload}`);
  }
  if (!regData.token || !regData.refreshToken || !regData.user) {
    throw new Error("Registration response missing tokens or user");
  }
  registeredToken = regData.token;
  registeredRefreshToken = regData.refreshToken;
  userId = regData.user.id;
  console.log("Registration successfully returned access and refresh tokens. User ID:", userId);

  // 2. VERIFY LOGIN
  console.log("\n--- Testing Login Flow ---");
  const loginResponse = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: testUser.email,
      password: testUser.password,
    },
  });

  console.log("Login response status:", loginResponse.statusCode);
  const loginData = JSON.parse(loginResponse.payload);
  if (loginResponse.statusCode !== 200) {
    throw new Error(`Login failed: ${loginResponse.payload}`);
  }
  if (!loginData.token || !loginData.refreshToken) {
    throw new Error("Login response missing tokens");
  }
  let loginToken = loginData.token;
  let loginRefreshToken = loginData.refreshToken;
  console.log("Login successfully returned new access and refresh tokens.");

  // 3. VERIFY REFRESH (ROTATION)
  console.log("\n--- Testing Refresh Token Rotation ---");
  const refreshResponse1 = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: loginRefreshToken,
    },
  });

  console.log("Refresh 1 response status:", refreshResponse1.statusCode);
  const refreshData1 = JSON.parse(refreshResponse1.payload);
  if (refreshResponse1.statusCode !== 200) {
    throw new Error(`First refresh failed: ${refreshResponse1.payload}`);
  }
  if (!refreshData1.token || !refreshData1.refreshToken) {
    throw new Error("First refresh response missing tokens");
  }
  let rotatedAccessToken = refreshData1.token;
  let rotatedRefreshToken = refreshData1.refreshToken;
  console.log("Refresh rotated tokens successfully. Old refresh token is now rotated.");

  // 4. VERIFY ROTATED REFRESH TOKEN WORKS
  console.log("\n--- Testing Rotated Refresh Token Works ---");
  const refreshResponse2 = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: rotatedRefreshToken,
    },
  });

  console.log("Refresh 2 response status:", refreshResponse2.statusCode);
  const refreshData2 = JSON.parse(refreshResponse2.payload);
  if (refreshResponse2.statusCode !== 200) {
    throw new Error(`Second refresh failed: ${refreshResponse2.payload}`);
  }
  let finalAccessToken = refreshData2.token;
  let finalRefreshToken = refreshData2.refreshToken;
  console.log("Rotated refresh token verified successfully.");

  // 5. VERIFY REUSE (REPLAY ATTACK) DETECTION FAILS & REVOKES ALL SESSIONS
  console.log("\n--- Testing Replay Attack (Token Reuse) Detection ---");
  // Try to use the first loginRefreshToken again
  const replayResponse = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: loginRefreshToken,
    },
  });

  console.log("Replay response status (expect 401):", replayResponse.statusCode);
  if (replayResponse.statusCode !== 401) {
    throw new Error(`Replay attack did not fail! Code: ${replayResponse.statusCode}`);
  }
  console.log("Replay attack failed as expected.");

  // Verify that the newest rotated token (finalRefreshToken) is now invalid as well because all sessions were revoked
  console.log("\n--- Testing if all sessions were revoked after replay attack ---");
  const checkRevokedResponse = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: finalRefreshToken,
    },
  });

  console.log("Revoked token refresh response status (expect 401):", checkRevokedResponse.statusCode);
  if (checkRevokedResponse.statusCode !== 401) {
    throw new Error(`Revoked refresh token still worked! Code: ${checkRevokedResponse.statusCode}`);
  }
  console.log("All sessions were successfully revoked after reuse detection.");

  // 6. VERIFY LOGOUT
  console.log("\n--- Testing Logout Flow ---");
  // Login again to get new tokens
  const newLoginResponse = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: testUser.email,
      password: testUser.password,
    },
  });
  const newLoginData = JSON.parse(newLoginResponse.payload);
  let activeRefreshToken = newLoginData.refreshToken;

  // Logout using activeRefreshToken
  const logoutResponse = await app.inject({
    method: "POST",
    url: "/auth/logout",
    payload: {
      refreshToken: activeRefreshToken,
    },
  });

  console.log("Logout response status:", logoutResponse.statusCode);
  if (logoutResponse.statusCode !== 200) {
    throw new Error(`Logout failed: ${logoutResponse.payload}`);
  }
  console.log("Logout route returned success.");

  // Try to refresh with logged out token
  const postLogoutRefresh = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: activeRefreshToken,
    },
  });
  console.log("Refresh after logout status (expect 401):", postLogoutRefresh.statusCode);
  if (postLogoutRefresh.statusCode !== 401) {
    throw new Error("Logged out refresh token still worked!");
  }
  console.log("Logout verified successfully.");

  // 7. VERIFY LOGOUT ALL DEVICES
  console.log("\n--- Testing Logout All Devices Flow ---");
  // Get new session
  const finalLoginResponse = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: testUser.email,
      password: testUser.password,
    },
  });
  const finalLoginData = JSON.parse(finalLoginResponse.payload);
  let finalAccess = finalLoginData.token;
  let finalRefresh = finalLoginData.refreshToken;

  // Call logout-all with bearer access token
  const logoutAllResponse = await app.inject({
    method: "POST",
    url: "/auth/logout-all",
    headers: {
      Authorization: `Bearer ${finalAccess}`,
    },
  });

  console.log("Logout-all response status:", logoutAllResponse.statusCode);
  if (logoutAllResponse.statusCode !== 200) {
    throw new Error(`Logout-all failed: ${logoutAllResponse.payload}`);
  }
  console.log("Logout-all endpoint returned success.");

  // Refresh with finalRefresh should fail
  const postLogoutAllRefresh = await app.inject({
    method: "POST",
    url: "/auth/refresh",
    payload: {
      refreshToken: finalRefresh,
    },
  });
  console.log("Refresh after logout-all status (expect 401):", postLogoutAllRefresh.statusCode);
  if (postLogoutAllRefresh.statusCode !== 401) {
    throw new Error("Refresh token still worked after logout-all!");
  }
  console.log("Logout all devices verified successfully.");

  console.log("\n=== ALL AUTH FLOW VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  await app.close();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
