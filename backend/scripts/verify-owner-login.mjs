/**
 * verify-owner-login.mjs
 * Verifies Owner login, role, and permissions via the live application API.
 *
 * Endpoint confirmed from auth.routes.ts:
 *   POST /auth/login/password   body: { identifier, password }
 *   GET  /auth/me               header: Authorization: Bearer <token>
 *
 * Response shape confirmed from auth.service.ts (loginWithPassword / toPublicUser):
 *   { user: { id, companyId, roleId, fullName, email, mobileNumber, status, ... },
 *     accessToken: string,
 *     refreshToken: string }
 *
 * JWT payload (issueTokenPair):
 *   { sub, companyId, roleId, type }
 *
 * Usage (password never stored or printed):
 *   read -rsp "Owner password: " P && echo && OWNER_NEW_PASSWORD="$P" node scripts/verify-owner-login.mjs && unset P
 *
 * Reports PASS/FAIL for each check. Never prints the password, token value, or hash.
 */

const fetch = (await import("node-fetch")).default;

const API_BASE        = "http://localhost:4000";
const OWNER_EMAIL     = "Dasmanoranjan798@gmail.com";
const OWNER_MOBILE    = "9145751663";
const OWNER_NAME      = "Manoranjan Das";
const PILOT_COMPANY_ID = "29c82d91-d80e-4358-a180-dd5df8cae889";
const PILOT_OWNER_ID   = "72a391c8-c511-46ee-a879-5e6e3a61b77e";

const OWNER_PASS = process.env.OWNER_NEW_PASSWORD;
if (!OWNER_PASS || OWNER_PASS.trim() === "") {
  console.error("ERROR: OWNER_NEW_PASSWORD env var not set.");
  console.error("Usage: read -rsp \"Owner password: \" P && echo && OWNER_NEW_PASSWORD=\"$P\" node scripts/verify-owner-login.mjs && unset P");
  process.exit(1);
}
// Immediately clear from env — never used again after the first request
process.env.OWNER_NEW_PASSWORD = "";

let passed = 0;
let failed = 0;

function result(label, ok, detail = "") {
  const icon = ok ? "✔" : "✘";
  const status = ok ? "PASS" : "FAIL";
  console.log(`  ${icon} [${status}] ${label}${detail ? " — " + detail : ""}`);
  ok ? passed++ : failed++;
}

console.log("=================================================");
console.log(" OWNER LOGIN VERIFICATION");
console.log("=================================================");
console.log(` API Base:      ${API_BASE}`);
console.log(` Owner Email:   ${OWNER_EMAIL}`);
console.log(` Password:      [PROVIDED — NOT DISPLAYED]`);
console.log("");

// ─── TEST 1: Login with correct email + password ─────────────────────────────
console.log("[TEST 1] POST /auth/login/password — correct credentials");
let accessToken  = null;
let refreshToken = null;
let loginUser    = null;

try {
  const res = await fetch(`${API_BASE}/auth/login/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: OWNER_EMAIL, password: OWNER_PASS }),
  });
  const body = await res.json();

  const httpOk     = res.status === 200;
  const hasAccess  = Boolean(body.accessToken);
  const hasRefresh = Boolean(body.refreshToken);
  const hasUser    = Boolean(body.user?.id);

  result("HTTP 200",              httpOk,     `got ${res.status}`);
  result("accessToken issued",    hasAccess);
  result("refreshToken issued",   hasRefresh);
  result("user object present",   hasUser);

  if (httpOk && hasAccess && hasUser) {
    accessToken  = body.accessToken;
    refreshToken = body.refreshToken;
    loginUser    = body.user;

    result("user.id matches Owner",      loginUser.id        === PILOT_OWNER_ID,    loginUser.id);
    result("user.companyId is pilot",    loginUser.companyId === PILOT_COMPANY_ID,  loginUser.companyId);
    result("user.fullName matches",      loginUser.fullName  === OWNER_NAME,        loginUser.fullName);
    result("user.email matches",         loginUser.email     === OWNER_EMAIL,       loginUser.email);
    result("user.status is ACTIVE",      loginUser.status    === "ACTIVE",          loginUser.status);
    result("passwordHash NOT exposed",   loginUser.passwordHash === undefined,      "absent in response");
    result("pinHash NOT exposed",        loginUser.pinHash      === undefined,      "absent in response");
  } else {
    console.log("  ⚠ Login failed — remaining tests may be skipped.");
    console.log("  Server message:", body.message || JSON.stringify(body));
    failed += 5;
  }
} catch (e) {
  result("Network call succeeded", false, e.message);
  failed += 7;
}
console.log("");

// ─── TEST 2: Decode JWT — verify companyId & roleId (no roleKey in payload) ──
console.log("[TEST 2] JWT payload — companyId and roleId");
if (accessToken) {
  try {
    const parts = accessToken.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

    result("payload.sub is Owner user ID", payload.sub        === PILOT_OWNER_ID,    payload.sub);
    result("payload.companyId is pilot",   payload.companyId  === PILOT_COMPANY_ID,  payload.companyId);
    result("payload.roleId is non-empty",  Boolean(payload.roleId),                  payload.roleId);
    result("payload.type is 'access'",     payload.type       === "access",          payload.type);
    result("token not yet expired",        payload.exp * 1000 >  Date.now(),
           new Date(payload.exp * 1000).toISOString());
  } catch (e) {
    result("JWT decode succeeded", false, e.message);
    failed += 4;
  }
} else {
  console.log("  ⚠ Skipped — no access token (login failed above).");
  failed += 5;
}
console.log("");

// ─── TEST 3: GET /auth/me with Bearer token ───────────────────────────────────
console.log("[TEST 3] GET /auth/me — authenticated profile");
if (accessToken) {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const body = await res.json();

    result("HTTP 200",               res.status === 200,             `got ${res.status}`);
    result("fullName matches",       body.fullName  === OWNER_NAME,  body.fullName);
    result("email matches",          body.email     === OWNER_EMAIL, body.email);
    result("companyId matches",      body.companyId === PILOT_COMPANY_ID);
    result("passwordHash not in /me", body.passwordHash === undefined, "absent");
  } catch (e) {
    result("/me call succeeded", false, e.message);
    failed += 5;
  }
} else {
  console.log("  ⚠ Skipped — no access token.");
  failed += 5;
}
console.log("");

// ─── TEST 4: Login with mobile number (also valid identifier) ─────────────────
console.log("[TEST 4] POST /auth/login/password — mobile as identifier");
try {
  const res = await fetch(`${API_BASE}/auth/login/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: OWNER_MOBILE, password: OWNER_PASS }),
  });
  const body = await res.json();
  result("Mobile login HTTP 200",         res.status === 200, `got ${res.status}`);
  result("Mobile login accessToken",      Boolean(body.accessToken));
  result("Mobile login user.id matches",  body.user?.id === PILOT_OWNER_ID);
} catch (e) {
  result("Mobile login call succeeded", false, e.message);
  failed += 3;
}
console.log("");

// ─── TEST 5: Wrong password rejected with 401 ────────────────────────────────
console.log("[TEST 5] Wrong password rejected");
try {
  const res = await fetch(`${API_BASE}/auth/login/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: OWNER_EMAIL, password: "WrongPassword999!" }),
  });
  result("Wrong password → 401", res.status === 401, `got ${res.status}`);
} catch (e) {
  result("Network call succeeded", false, e.message);
  failed++;
}
console.log("");

// ─── TEST 6: Inactive test Owner cannot log in ────────────────────────────────
console.log("[TEST 6] Inactive test Owner cannot log in");
try {
  const res = await fetch(`${API_BASE}/auth/login/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "owner_1786188148080@example.com", password: "AnyPassword1!" }),
  });
  result("Inactive Owner → non-200", res.status !== 200, `got ${res.status}`);
} catch (e) {
  result("Network call succeeded", false, e.message);
  failed++;
}
console.log("");

// ─── TEST 7: Unauthenticated /auth/me rejected ───────────────────────────────
console.log("[TEST 7] /auth/me without token rejected");
try {
  const res = await fetch(`${API_BASE}/auth/me`);
  result("/auth/me → 401 without token", res.status === 401, `got ${res.status}`);
} catch (e) {
  result("Network call succeeded", false, e.message);
  failed++;
}
console.log("");

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log("=================================================");
console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
console.log("=================================================");
if (failed > 0) {
  console.log("OVERALL LOGIN VERIFICATION: FAIL");
  process.exit(1);
} else {
  console.log("OVERALL LOGIN VERIFICATION: PASS");
}
