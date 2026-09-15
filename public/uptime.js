(function () {
  "use strict";

  // ===============================
  // Forks Land Uptime Monitor
  // ===============================

  const API_URL = "/api/uptime";

  const MIN_DELAY = 15000;
  const MAX_DELAY = 90000;

  let baseUptimeSeconds = 0;
  let lastSyncAt = Date.now();
  let isOnline = false;
  let pollDelay = MIN_DELAY;
  let pollTimer = null;

  // ===============================
  // Elements
  // ===============================

  const dot =
    document.getElementById("status-dot");

  const ring =
    document.getElementById("crest-ring");

  const statusText =
    document.getElementById("status-text");

  const dEl =
    document.getElementById("d");

  const hEl =
    document.getElementById("h");

  const mEl =
    document.getElementById("m");

  const sEl =
    document.getElementById("s");

  const serverNameEl =
    document.getElementById("serverName");

  const memberCountEl =
    document.getElementById("memberCount");

  const sinceEl =
    document.getElementById("since");

  const lastCheckedEl =
    document.getElementById("last-checked");

  const offlineBanner =
    document.getElementById("offline-banner");


  // ===============================
  // Helpers
  // ===============================

  function pad(number) {
    return String(number).padStart(2, "0");
  }


  function renderTimer(totalSeconds) {

    totalSeconds =
      Math.max(
        0,
        Number(totalSeconds) || 0
      );

    const days =
      Math.floor(
        totalSeconds / 86400
      );

    const hours =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      Math.floor(
        totalSeconds % 60
      );

    if (dEl)
      dEl.textContent = pad(days);

    if (hEl)
      hEl.textContent = pad(hours);

    if (mEl)
      mEl.textContent = pad(minutes);

    if (sEl)
      sEl.textContent = pad(seconds);
  }


  // ===============================
  // Live uptime counter
  // ===============================

  function tick() {

    if (!isOnline)
      return;

    const elapsed =
      (Date.now() - lastSyncAt) / 1000;

    renderTimer(
      baseUptimeSeconds +
      elapsed
    );
  }


  // ===============================
  // Status UI
  // ===============================

  function setStatus(
    kind,
    data
  ) {

    /*
      kind:
      online
      offline
      reconnecting
    */

    if (document.body) {

      document.body.classList.toggle(
        "is-offline",
        kind !== "online"
      );
    }


    if (dot) {

      dot.className =
        "status-dot " +
        (
          kind === "reconnecting"
            ? "reconnecting"
            : kind
        );
    }


    if (ring) {

      ring.className =
        "crest-ring " +
        (
          kind === "reconnecting"
            ? "reconnecting"
            : kind
        );
    }


    // ONLINE
    if (kind === "online") {

      if (statusText) {

        statusText.innerHTML =
          "<strong>Online</strong>";
      }

      isOnline = true;

      if (offlineBanner) {

        offlineBanner.style.display =
          "none";
      }
    }


    // RECONNECTING
    else if (kind === "reconnecting") {

      if (statusText) {

        statusText.textContent =
          "Reconnecting…";
      }

      isOnline = false;

      if (offlineBanner) {

        offlineBanner.style.display =
          "block";
      }
    }


    // OFFLINE
    else {

      if (statusText) {

        statusText.innerHTML =
          "<strong>Offline</strong>";
      }

      isOnline = false;

      if (offlineBanner) {

        offlineBanner.style.display =
          "block";
      }
    }


    // ===============================
    // Server information
    // ===============================

    if (data) {

      if (serverNameEl) {

        serverNameEl.textContent =
          data.serverName ||
          "Forks Land";
      }


      if (memberCountEl) {

        const count =
          data.memberCount;

        memberCountEl.textContent =
          count != null
            ? Number(count).toLocaleString()
            : "—";
      }


      if (
        sinceEl &&
        data.startedAt
      ) {

        const startDate =
          new Date(
            data.startedAt
          );

        if (
          !isNaN(
            startDate.getTime()
          )
        ) {

          sinceEl.textContent =
            startDate.toLocaleString(
              undefined,
              {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              }
            );
        }
      }
    }
  }


  // ===============================
  // Fetch API
  // ===============================

  async function fetchUptime() {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        function () {
          controller.abort();
        },
        10000
      );

    try {

      const response =
        await fetch(
          API_URL,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Accept":
                "application/json"
            },
            signal:
              controller.signal
          }
        );


      if (!response.ok) {

        throw new Error(
          "API request failed: HTTP " +
          response.status
        );
      }


      const data =
        await response.json();


      if (
        !data ||
        typeof data !== "object"
      ) {

        throw new Error(
          "Invalid API response"
        );
      }


      return data;

    }

    finally {

      clearTimeout(timeout);
    }
  }


  // ===============================
  // Refresh status
  // ===============================

  async function refresh() {

    try {

      const data =
        await fetchUptime();


      if (data.online) {

        setStatus(
          "online",
          data
        );

      } else {

        setStatus(
          "offline",
          data
        );
      }


      // Update uptime
      baseUptimeSeconds =
        Number(
          data.uptimeSeconds
        ) || 0;


      lastSyncAt =
        Date.now();


      renderTimer(
        baseUptimeSeconds
      );


      if (lastCheckedEl) {

        lastCheckedEl.textContent =
          "just now";
      }


      // Successful request
      pollDelay =
        MIN_DELAY;

    }

    catch (error) {

      console.error(
        "Forks Land uptime:",
        error
      );


      setStatus(
        isOnline
          ? "reconnecting"
          : "offline"
      );


      // Retry with backoff
      pollDelay =
        Math.min(
          pollDelay * 1.6,
          MAX_DELAY
        );
    }


    clearTimeout(
      pollTimer
    );


    pollTimer =
      setTimeout(
        refresh,
        pollDelay
      );
  }


  // ===============================
  // Last checked timer
  // ===============================

  setInterval(
    tick,
    1000
  );


  setInterval(
    function () {

      if (
        !isOnline ||
        !lastCheckedEl
      ) {
        return;
      }


      const secondsAgo =
        Math.max(
          1,
          Math.round(
            (
              Date.now() -
              lastSyncAt
            ) / 1000
          )
        );


      lastCheckedEl.textContent =
        secondsAgo + "s ago";

    },
    1000
  );


  // ===============================
  // Start
  // ===============================

  renderTimer(0);

  refresh();

})();
