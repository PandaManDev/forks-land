const { supabaseRequest } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest(
        "site_settings?id=eq.1&select=*"
      );

      return res.status(200).json({
        ok: true,
        settings: rows?.[0] || null
      });
    }

    if (!requireAdmin(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};

      const update = {};

      if (typeof body.maintenance === "boolean") {
        update.maintenance =
          body.maintenance;
      }

      if (
        typeof body.maintenance_message ===
        "string"
      ) {
        update.maintenance_message =
          body.maintenance_message.slice(0, 1000);
      }

      if (
        typeof body.honeypot_enabled ===
        "boolean"
      ) {
        update.honeypot_enabled =
          body.honeypot_enabled;
      }

      const rows = await supabaseRequest(
        "site_settings?id=eq.1",
        {
          method: "PATCH",
          headers: {
            Prefer: "return=representation"
          },
          body: JSON.stringify(update)
        }
      );

      return res.status(200).json({
        ok: true,
        settings: rows?.[0]
      });
    }

    return res.status(405).json({
      error: "Method not allowed."
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
