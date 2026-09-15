const { supabaseRequest } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await supabaseRequest(
        "incidents?select=*&order=created_at.desc&limit=50"
      );

      return res.status(200).json({
        ok: true,
        incidents: rows || []
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
        "incidents",
        {
          method: "POST",
          headers: {
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            title: String(body.title).slice(0, 200),
            description:
              String(body.description || "").slice(0, 2000),
            status:
              body.status || "investigating"
          })
        }
      );

      return res.status(201).json({
        ok: true,
        incident: rows?.[0]
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};

      if (!body.id) {
        return res.status(400).json({
          ok: false,
          error: "Incident ID required."
        });
      }

      const update = {
        status:
          body.status || "investigating",
        updated_at:
          new Date().toISOString()
      };

      if (body.status === "resolved") {
        update.resolved_at =
          new Date().toISOString();
      }

      const rows = await supabaseRequest(
        `incidents?id=eq.${encodeURIComponent(body.id)}`,
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
        incident: rows?.[0]
      });
    }

    if (req.method === "DELETE") {
      const id = req.query?.id;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Incident ID required."
        });
      }

      await supabaseRequest(
        `incidents?id=eq.${encodeURIComponent(id)}`,
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
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
