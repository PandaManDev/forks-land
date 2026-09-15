const crypto = require("crypto");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

function createToken() {
  const timestamp = Date.now().toString();

  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

function verifyToken(token) {
  if (!token) return false;

  const parts = token.split(".");

  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;

  const age = Date.now() - Number(timestamp);

  if (!Number.isFinite(age)) return false;

  // 7 day session
  if (age < 0 || age > 7 * 24 * 60 * 60 * 1000) {
    return false;
  }

  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

function requireAdmin(req) {
  const token = getCookie(req, "forks_admin");

  if (!verifyToken(token)) {
    return false;
  }

  return true;
}

module.exports = {
  createToken,
  requireAdmin
};
