export default async function handler(req, res) {

  const GUILD_ID =
    "1544159911875707003";

  try {

    const start =
      Date.now();


    const response =
      await fetch(

        `https://discord.com/api/guilds/${GUILD_ID}/widget.json`,

        {
          method:"GET",

          headers:{
            "User-Agent":
              "Forks-Land-Status-Dashboard/1.0",

            "Accept":
              "application/json"
          },

          cache:"no-store"
        }

      );


    const latency =
      Date.now() - start;


    if(
      !response.ok
    ){

      return res.status(502).json({

        online:false,

        serverName:
          "Forks Land",

        guildId:
          GUILD_ID,

        memberCount:null,

        onlineMembers:0,

        uptimeSeconds:0,

        startedAt:null,

        latencyMs:
          latency,

        error:
          `Discord returned HTTP ${response.status}`

      });

    }


    const discord =
      await response.json();


    /*
      Discord's widget API does not provide
      actual Discord bot process uptime.

      This timer measures the lifetime of the
      current Vercel monitoring instance.

      For real bot uptime, your bot needs to
      send heartbeat information to a persistent
      database or health endpoint.
    */


    if(
      !globalThis.forksLandStartedAt
    ){

      globalThis.forksLandStartedAt =
        Date.now();

    }


    const startedAt =
      globalThis.forksLandStartedAt;


    const users =
      Array.isArray(
        discord.members
      )
      ?
      discord.members.map(
        member => ({

          username:
            member.username ||
            member.nick ||
            "Discord user",

          nick:
            member.nick ||
            null,

          avatar_url:
            member.avatar_url ||
            null,

          status:
            "online"

        })
      )
      :
      [];


    const memberCount =
      typeof discord.member_count ===
      "number"

      ?

      discord.member_count

      :

      users.length;


    const onlineMembers =
      typeof discord.presence_count ===
      "number"

      ?

      discord.presence_count

      :

      users.length;


    const uptimeSeconds =
      Math.floor(
        (
          Date.now() -
          startedAt
        ) / 1000
      );


    return res.status(200).json({

      online:true,

      serverName:
        discord.name ||
        "Forks Land",

      guildId:
        GUILD_ID,

      memberCount,

      onlineMembers,

      users,

      icon:
        discord.icon_url ||
        null,

      uptimeSeconds,

      startedAt:
        new Date(
          startedAt
        ).toISOString(),

      latencyMs:
        latency

    });


  }

  catch(error){

    console.error(
      "Forks Land API Error:",
      error
    );


    return res.status(500).json({

      online:false,

      serverName:
        "Forks Land",

      guildId:
        GUILD_ID,

      memberCount:null,

      onlineMembers:0,

      uptimeSeconds:0,

      startedAt:null,

      error:
        "Unable to reach Discord widget API"

    });

  }

}
