const { supabaseRequest } = require("./_lib/supabase");

const DISCORD_WIDGET =
  "https://discord.com/api/guilds/1544159911875707003/widget.json";

module.exports = async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );

  try {
    const now = Date.now();

    const [
      botRows,
      settingsRows,
      incidents,
      announcements,
      history
    ] = await Promise.all([
      supabaseRequest(
        "bot_status?id=eq.1&select=*"
      ),

      supabaseRequest(
        "site_settings?id=eq.1&select=*"
      ),

      supabaseRequest(
        "incidents?select=*&order=created_at.desc&limit=20"
      ),

      supabaseRequest(
        "announcements?select=*&order=created_at.desc&limit=10"
      ),

      supabaseRequest(
        "uptime_history?select=*&order=checked_at.desc&limit=2880"
      )
    ]);

    let discord = null;

    try {
      const discordResponse =
        await fetch(DISCORD_WIDGET, {
          cache: "no-store"
        });

      if (discordResponse.ok) {
        discord = await discordResponse.json();
      }
    } catch {
      discord = null;
    }

    const bot = botRows?.[0] || null;

    let botOnline = false;
    let uptimeSeconds = 0;

    if (bot?.last_heartbeat) {
      const heartbeatAge =
        now - new Date(bot.last_heartbeat).getTime();

      // Consider bot offline after 90 seconds.
      botOnline =
        heartbeatAge <= 90000;

      if (
        botOnline &&
        bot.started_at
      ) {
        uptimeSeconds = Math.max(
          0,
          Math.floor(
            (now -
              new Date(bot.started_at).getTime()) /
              1000
          )
        );
      }
    }

    return res.status(200).json({
      ok: true,

      maintenance:
        settingsRows?.[0]?.maintenance || false,

      maintenanceMessage:
        settingsRows?.[0]?.maintenance_message ||
        "Forks Land is currently undergoing maintenance.",

      honeypotEnabled:
        settingsRows?.[0]?.honeypot_enabled !== false,

      bot: {
        online: botOnline,
        name: bot?.bot_name || "Forks Land Bot",
        version: bot?.version || "1.0.0",
        latencyMs: bot?.latency_ms || 0,
        startedAt: bot?.started_at || null,
        lastHeartbeat:
          bot?.last_heartbeat || null,
        uptimeSeconds
      },

      discord: discord
        ? {
            onlineMembers:
              discord.presence_count || 0,

            users:
              Array.isArray(discord.members)
                ? discord.members
                : [],

            icon:
              discord.icon || null,

            name:
              discord.name || "Forks Land",

            guildId:
              discord.id ||
              "1544159911875707003"
          }
        : null,

      incidents:
        incidents || [],

      announcements:
        announcements || [],

      history:
        history || [],

      checkedAt:
        new Date().toISOString()
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Status API unavailable."
    });
  }
};
