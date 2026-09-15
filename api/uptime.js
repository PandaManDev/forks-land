// uptime.js
(function () {
  'use strict';

  const dot = document.getElementById('status-dot');
  const ring = document.getElementById('crest-ring');
  const statusText = document.getElementById('status-text');

  const dEl = document.getElementById('d');
  const hEl = document.getElementById('h');
  const mEl = document.getElementById('m');
  const sEl = document.getElementById('s');

  const serverNameEl = document.getElementById('serverName');
  const memberCountEl = document.getElementById('memberCount');
  const sinceEl = document.getElementById('since');
  const lastCheckedEl = document.getElementById('last-checked');

  let baseUptimeSeconds = 0;
  let lastSyncAt = Date.now();
  let isOnline = false;

  let pollDelay = 15000;

  const MIN_DELAY = 15000;
  const MAX_DELAY = 90000;

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function renderTimer(totalSeconds) {
    totalSeconds = Math.max(0, totalSeconds);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (dEl) dEl.textContent = pad(days);
    if (hEl) hEl.textContent = pad(hours);
    if (mEl) mEl.textContent = pad(minutes);
    if (sEl) sEl.textContent = pad(seconds);
  }

  function tick() {
    if (!isOnline) return;

    const elapsed = (Date.now() - lastSyncAt) / 1000;

    renderTimer(baseUptimeSeconds + elapsed);
  }

  function setStatus(kind, data) {
    // kind = online | offline | reconnecting

    document.body.classList.toggle(
      'is-offline',
      kind !== 'online'
    );

    if (dot) {
      dot.className =
        'status-dot ' +
        (kind === 'reconnecting'
          ? 'reconnecting'
          : kind);
    }

    if (ring) {
      ring.className =
        'crest-ring ' +
        (kind === 'reconnecting'
          ? 'reconnecting'
          : kind);
    }

    if (kind === 'online') {
      if (statusText) {
        statusText.innerHTML = '<strong>Online</strong>';
      }

      isOnline = true;

    } else if (kind === 'reconnecting') {

      if (statusText) {
        statusText.textContent = 'Reconnecting…';
      }

      isOnline = false;

    } else {

      if (statusText) {
        statusText.innerHTML = '<strong>Offline</strong>';
      }

      isOnline = false;
    }

    // Update server information
    if (data) {

      if (serverNameEl) {
        serverNameEl.textContent =
          data.serverName || '—';
      }

      if (memberCountEl) {
        memberCountEl.textContent =
          data.memberCount != null
            ? Number(data.memberCount).toLocaleString()
            : '—';
      }

      if (sinceEl && data.startedAt) {

        const startDate =
          new Date(data.startedAt);

        sinceEl.textContent =
          startDate.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
      }
    }
  }

  async function fetchUptime() {

    const controller =
      new AbortController();

    // Stop requests that hang forever
    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 10000);

    try {

      const response =
        await fetch('/api/uptime', {
          cache: 'no-store',
          signal: controller.signal
        });

      if (!response.ok) {
        throw new Error(
          'Request failed (' +
          response.status +
          ')'
        );
      }

      return await response.json();

    } finally {

      clearTimeout(timeout);
    }
  }

  async function refresh() {

    try {

      const data =
        await fetchUptime();

      setStatus(
        data.online
          ? 'online'
          : 'offline',
        data
      );

      baseUptimeSeconds =
        Number(data.uptimeSeconds) || 0;

      lastSyncAt =
        Date.now();

      renderTimer(
        baseUptimeSeconds
      );

      if (lastCheckedEl) {
        lastCheckedEl.textContent =
          'just now';
      }

      // Successful request:
      // reset retry delay
      pollDelay =
        MIN_DELAY;

    } catch (error) {

      console.error(
        'Forks Land uptime error:',
        error
      );

      setStatus(
        isOnline
          ? 'reconnecting'
          : 'offline'
      );

      // Exponential-ish backoff
      pollDelay =
        Math.min(
          pollDelay * 1.6,
          MAX_DELAY
        );
    }

    clearTimeout(pollTimer);

    pollTimer =
      setTimeout(
        refresh,
        pollDelay
      );
  }

  let pollTimer = null;

  // Update uptime every second
  setInterval(
    tick,
    1000
  );

  // Update "last checked"
  setInterval(() => {

    if (!isOnline) return;

    if (lastCheckedEl) {

      const secondsAgo =
        Math.max(
          1,
          Math.round(
            (Date.now() - lastSyncAt) /
            1000
          )
        );

      lastCheckedEl.textContent =
        secondsAgo + 's ago';
    }

  }, 1000);

  // Start monitoring
  refresh();

})();
