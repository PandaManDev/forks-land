export default async function handler(req, res) {
  // Forks Land Discord Server
  const GUILD_ID = "1544159911875707003";

  try {
    const response = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/widget.json`,
      {
        method: "GET",
        headers: {
          "User-Agent": "Forks-Land-Status/1.0"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        online: false,
        serverName: "Forks Land",
        memberCount: null,
        uptimeSeconds: 0,
        startedAt: null,
        error: `Discord returned HTTP ${response.status}`
      });
    }

    const discord = await response.json();

    /*
      Discord's widget doesn't provide the bot's actual process uptime.

      This endpoint uses the time the Vercel function first sees the
      server as available. For REAL bot uptime, your bot should expose
      its own uptime value.
    */

    const now = Date.now();

    // Keep a simple server-side start time for this function instance.
    if (!globalThis.forksLandStartedAt) {
      globalThis.forksLandStartedAt = now;
    }

    const startedAt =
      globalThis.forksLandStartedAt;

    const uptimeSeconds =
      Math.floor((now - startedAt) / 1000);

    return res.status(200).json({
      online: true,

      serverName:
        discord.name || "Forks Land",

      memberCount:
        discord.presence_count ??
        discord.members?.length ??
        0,

      uptimeSeconds,

      startedAt:
        new Date(startedAt).toISOString(),

      onlineMembers:
        discord.presence_count ?? 0,

      users:
        Array.isArray(discord.members)
          ? discord.members
          : []
    });

  } catch (error) {

    console.error(
      "Forks Land uptime error:",
      error
    );

    return res.status(500).json({
      online: false,
      serverName: "Forks Land",
      memberCount: null,
      uptimeSeconds: 0,
      startedAt: null,
      error: "Unable to reach Discord"
    });
  }
}
