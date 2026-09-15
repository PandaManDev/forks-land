const { createToken } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { password } = req.body || {};

      if (
        !process.env.ADMIN_PASSWORD ||
        !password ||
        password !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({
          ok: false,
          error: "Invalid password."
        });
      }

      const token = createToken();

      res.setHeader(
        "Set-Cookie",
        `forks_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
      );

      return res.status(200).json({
        ok: true
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  }

  if (req.method === "DELETE") {
    res.setHeader(
      "Set-Cookie",
      "forks_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    );

    return res.status(200).json({
      ok: true
    });
  }

  if (req.method === "GET") {
    const { requireAdmin } = require("./_lib/auth");

    return res.status(200).json({
      authenticated: requireAdmin(req)
    });
  }

  return res.status(405).json({
    error: "Method not allowed."
  });
};
