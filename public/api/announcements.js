const { supabaseRequest } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest(
        "announcements?select=*&order=created_at.desc&limit=20"
      );

      return res.status(200).json({
        ok: true,
        announcements: rows || []
      });
    }

    if (!requireAdmin(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.title) {
        return res.status(400).json({
          ok: false,
          error: "Title is required."
        });
      }

      const rows = await supabaseRequest(
        "announcements",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            title:
              String(body.title).slice(0, 200),

            message:
              String(body.message || "").slice(0, 4000),

            type:
              body.type || "info"
          })
        }
      );

      return res.status(201).json({
        ok: true,
        announcement: rows?.[0]
      });
    }

    if (req.method === "DELETE") {
      const id = req.query?.id;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Announcement ID required."
        });
      }

      await supabaseRequest(
        `announcements?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE"
        }
      );

      return res.status(200).json({
        ok: true
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
