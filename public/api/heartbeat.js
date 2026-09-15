const { supabaseRequest } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const auth = req.headers.authorization || "";

    const expected =
      `Bearer ${process.env.BOT_HEARTBEAT_SECRET}`;

    if (
      !process.env.BOT_HEARTBEAT_SECRET ||
      auth !== expected
    ) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    const body = req.body || {};

    const botName =
      String(body.botName || "Forks Land Bot").slice(0, 100);

    const version =
      String(body.version || "1.0.0").slice(0, 50);

    const latency =
      Math.max(
        0,
        Math.min(
          999999,
          Number(body.latencyMs || 0)
        )
      );

    const existing = await supabaseRequest(
      "bot_status?id=eq.1&select=*"
    );

    const current = existing?.[0];

    let startedAt =
      current?.started_at || new Date().toISOString();

    // If bot was previously offline, begin a new uptime session.
    if (!current?.online) {
      startedAt = new Date().toISOString();
    }

    const now = new Date().toISOString();

    await supabaseRequest(
      "bot_status?id=eq.1",
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          bot_name: botName,
          version,
          online: true,
          latency_ms: Math.round(latency),
          started_at: startedAt,
          last_heartbeat: now,
          updated_at: now
        })
      }
    );

    await supabaseRequest(
      "uptime_history",
      {
        method: "POST",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          checked_at: now,
          online: true,
          latency_ms: Math.round(latency)
        })
      }
    );

    return res.status(200).json({
      ok: true,
      online: true,
      startedAt,
      heartbeat: now
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Heartbeat failed."
    });
  }
};
