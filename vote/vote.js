(function () {
  "use strict";

  var TRACKS = [
    { id: "track-01", number: "01", title: "Track 01", src: "/vote/tracks/01-track-01.mp3" },
    { id: "track-02", number: "02", title: "Track 02", src: "/vote/tracks/02-track-02.mp3" },
    { id: "track-03", number: "03", title: "Track 03", src: "/vote/tracks/03-track-03.mp3" },
    { id: "track-04", number: "04", title: "Track 04", src: "/vote/tracks/04-track-04.mp3" },
    { id: "track-05", number: "05", title: "Track 05", src: "/vote/tracks/05-track-05.mp3" },
    { id: "track-06", number: "06", title: "Track 06", src: "/vote/tracks/06-track-06.mp3" },
    { id: "track-07", number: "07", title: "Track 07", src: "/vote/tracks/07-track-07.mp3" },
    { id: "track-08", number: "08", title: "Track 08", src: "/vote/tracks/08-track-08.mp3" },
    { id: "track-09", number: "09", title: "Track 09", src: "/vote/tracks/09-track-09.mp3" },
    { id: "track-10", number: "10", title: "Track 10", src: "/vote/tracks/10-track-10.mp3" }
  ];

  var CONFIG = {
    maxSelections: 5,
    startAt: Date.parse("2026-05-18T00:00:00-04:00"),
    endAt: Date.parse("2026-05-21T00:00:00-04:00"),
    receiptKey: "b2nny_ep_vote_receipt_v1"
  };

  var endpointMeta = document.querySelector('meta[name="b2nny-vote-endpoint"]');
  CONFIG.endpoint = endpointMeta ? endpointMeta.getAttribute("content").trim() : "";
  CONFIG.previewPhase = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
    ? new URLSearchParams(window.location.search).get("preview")
    : "";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;

  var els = {
    trackList: document.getElementById("track-list"),
    voteBar: document.getElementById("vote-bar"),
    submit: document.getElementById("submit-vote"),
    selectionCount: document.getElementById("selection-count"),
    setupMessage: document.getElementById("setup-message"),
    voteMessage: document.getElementById("vote-message"),
    phaseCopy: document.getElementById("phase-copy"),
    countdownLabel: document.getElementById("countdown-label"),
    countdownValue: document.getElementById("countdown-value"),
    resultsSection: document.getElementById("results"),
    resultsList: document.getElementById("results-list"),
    resultsMeta: document.getElementById("results-meta"),
    thanksPanel: document.getElementById("thanks-panel")
  };

  var state = {
    selected: new Set(),
    audio: new Map(),
    currentId: "",
    playIntent: "",
    audioContext: null,
    animationFrame: 0,
    receipt: readReceipt(),
    phase: "before",
    submitting: false,
    resultsLoaded: false,
    resultsLoading: false
  };

  function init() {
    renderTracks();
    setupMotion();
    updatePhase();
    window.setInterval(updatePhase, 1000);

    if (!CONFIG.endpoint) {
      showSetup("Add your deployed Apps Script Web App URL to the b2nny-vote-endpoint meta tag before publishing voting.");
    }

    if (state.receipt && Array.isArray(state.receipt.choices)) {
      state.receipt.choices.forEach(function (id) {
        if (findTrack(id)) state.selected.add(id);
      });
      showThanks();
    }

    els.submit.addEventListener("click", submitVote);
    updateSelectionUI();

    if (state.receipt || state.phase === "closed") {
      loadResults();
    }
  }

  function renderTracks() {
    els.trackList.innerHTML = TRACKS.map(function (track) {
      return [
        '<article class="trackCard" data-track-id="' + track.id + '">',
        '  <button class="playButton" type="button" aria-label="Play ' + escapeHtml(track.title) + '" data-action="play">Play</button>',
        '  <div class="trackMain">',
        '    <div class="trackTopline">',
        '      <div class="trackTitle">' + track.number + '. ' + escapeHtml(track.title) + '</div>',
        '      <div class="trackState" data-role="state">idle</div>',
        '    </div>',
        '    <canvas class="waveform" width="640" height="80" aria-hidden="true"></canvas>',
        '    <div class="trackMeta">' + escapeHtml(track.src) + '</div>',
        '  </div>',
        '  <button class="selectButton" type="button" data-action="select">Select</button>',
        '</article>'
      ].join("");
    }).join("");

    TRACKS.forEach(function (track) {
      var card = getCard(track.id);
      drawFallbackWave(card.querySelector("canvas"), track.id);

      card.querySelector('[data-action="play"]').addEventListener("click", function () {
        if (state.currentId === track.id) {
          stopTrack(track.id, true);
        } else {
          playTrack(track.id, "manual");
        }
      });

      card.querySelector('[data-action="select"]').addEventListener("click", function () {
        toggleSelection(track.id);
      });

      if (finePointer) {
        card.addEventListener("mouseenter", function () {
          playTrack(track.id, "hover");
        });
        card.addEventListener("mouseleave", function () {
          if (state.currentId === track.id && state.playIntent === "hover") {
            stopTrack(track.id, true);
          }
        });
      }
    });
  }

  function playTrack(id, intent) {
    var track = findTrack(id);
    if (!track) return;
    if (state.currentId && state.currentId !== id) stopTrack(state.currentId, true);

    var item = ensureAudio(track);
    state.currentId = id;
    state.playIntent = intent;
    updatePlayingUI();

    if (state.audioContext && state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }

    item.audio.volume = 0;
    var playPromise = item.audio.play();
    if (playPromise && playPromise.catch) {
      playPromise
        .then(function () {
          fadeVolume(item.audio, 1, 180);
          startWaveAnimation();
        })
        .catch(function () {
          state.currentId = "";
          state.playIntent = "";
          updatePlayingUI();
          showVoteMessage("Press the play button to start audio. Some browsers block hover playback until a click.", false);
        });
    } else {
      fadeVolume(item.audio, 1, 180);
      startWaveAnimation();
    }
  }

  function stopTrack(id, fade) {
    var item = state.audio.get(id);
    if (!item) return;
    var finish = function () {
      item.audio.pause();
      if (state.currentId === id) {
        state.currentId = "";
        state.playIntent = "";
      }
      updatePlayingUI();
      drawFallbackWave(getCard(id).querySelector("canvas"), id);
    };
    if (fade) {
      fadeVolume(item.audio, 0, 170, finish);
    } else {
      item.audio.volume = 0;
      finish();
    }
  }

  function ensureAudio(track) {
    if (state.audio.has(track.id)) return state.audio.get(track.id);

    var audio = new Audio(track.src);
    audio.preload = "metadata";
    audio.volume = 0;

    var item = { audio: audio, analyser: null, data: null, source: null };

    audio.addEventListener("ended", function () {
      state.currentId = "";
      state.playIntent = "";
      updatePlayingUI();
    });
    audio.addEventListener("error", function () {
      showVoteMessage("Audio missing for " + track.title + ". Add the file at " + track.src + ".", true);
      var card = getCard(track.id);
      if (card) card.querySelector('[data-role="state"]').textContent = "missing";
    });

    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        if (!state.audioContext) state.audioContext = new AudioContext();
        item.source = state.audioContext.createMediaElementSource(audio);
        item.analyser = state.audioContext.createAnalyser();
        item.analyser.fftSize = 128;
        item.data = new Uint8Array(item.analyser.frequencyBinCount);
        item.source.connect(item.analyser);
        item.analyser.connect(state.audioContext.destination);
      }
    } catch (err) {}

    state.audio.set(track.id, item);
    return item;
  }

  function fadeVolume(audio, target, duration, done) {
    var start = audio.volume;
    var startedAt = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - startedAt) / duration);
      audio.volume = start + (target - start) * t;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (done) {
        done();
      }
    }
    requestAnimationFrame(tick);
  }

  function startWaveAnimation() {
    if (state.animationFrame) return;
    var fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#0a0a0a";
    var muted = getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#d4d4d4";

    function frame() {
      state.animationFrame = requestAnimationFrame(frame);
      if (!state.currentId) return;
      var item = state.audio.get(state.currentId);
      var card = getCard(state.currentId);
      if (!item || !card) return;
      var canvas = card.querySelector("canvas");
      var ctx = canvas.getContext("2d");
      var w = canvas.width;
      var h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!item.analyser || !item.data) {
        drawFallbackWave(canvas, state.currentId);
        return;
      }

      item.analyser.getByteFrequencyData(item.data);
      var bars = 56;
      var gap = 4;
      var barW = (w - gap * (bars - 1)) / bars;
      ctx.fillStyle = muted;
      ctx.fillRect(0, Math.floor(h / 2), w, 1);
      ctx.fillStyle = fg;
      for (var i = 0; i < bars; i++) {
        var dataIndex = Math.floor(i / bars * item.data.length);
        var value = item.data[dataIndex] / 255;
        var bh = Math.max(4, value * h * 0.88);
        var x = i * (barW + gap);
        var y = (h - bh) / 2;
        ctx.globalAlpha = 0.28 + value * 0.72;
        ctx.fillRect(x, y, barW, bh);
      }
      ctx.globalAlpha = 1;
    }
    frame();
  }

  function drawFallbackWave(canvas, seed) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    var fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#0a0a0a";
    var line = getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#d4d4d4";
    var n = 48;
    var hash = 0;
    for (var c = 0; c < seed.length; c++) hash = (hash * 31 + seed.charCodeAt(c)) % 9973;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = line;
    ctx.fillRect(0, Math.floor(h / 2), w, 1);
    ctx.fillStyle = fg;
    for (var i = 0; i < n; i++) {
      var wave = Math.sin((i + hash) * 0.62) * 0.5 + Math.sin((i + hash) * 0.19) * 0.5;
      var amp = 0.18 + Math.abs(wave) * 0.7;
      var bw = Math.max(3, Math.floor(w / n) - 5);
      var x = i * (w / n);
      var bh = Math.max(5, amp * h * 0.72);
      ctx.globalAlpha = 0.16 + amp * 0.34;
      ctx.fillRect(x, (h - bh) / 2, bw, bh);
    }
    ctx.globalAlpha = 1;
  }

  function toggleSelection(id) {
    if (state.receipt || state.phase !== "active") {
      showVoteMessage(state.phase === "before" ? "Voting has not opened yet." : "Voting is closed on this browser.", false);
      return;
    }
    if (state.selected.has(id)) {
      state.selected.delete(id);
    } else if (state.selected.size >= CONFIG.maxSelections) {
      shakeCard(id);
      showVoteMessage("Pick exactly 5. Deselect one before adding another.", false);
    } else {
      state.selected.add(id);
    }
    updateSelectionUI();
  }

  function updateSelectionUI() {
    var count = state.selected.size;
    els.selectionCount.textContent = count + " of " + CONFIG.maxSelections + " selected";
    els.submit.disabled = state.submitting || state.phase !== "active" || count !== CONFIG.maxSelections || !!state.receipt;
    els.voteBar.hidden = state.phase === "closed" || !!state.receipt;

    TRACKS.forEach(function (track) {
      var card = getCard(track.id);
      var selected = state.selected.has(track.id);
      var select = card.querySelector('[data-action="select"]');
      card.classList.toggle("is-selected", selected);
      card.classList.toggle("is-soft-disabled", count >= CONFIG.maxSelections && !selected && !state.receipt);
      select.classList.toggle("is-selected", selected);
      select.textContent = selected ? "Selected" : "Select";
      select.disabled = state.phase !== "active" || !!state.receipt;
    });
  }

  function submitVote() {
    if (state.submitting || state.selected.size !== CONFIG.maxSelections) return;
    if (!CONFIG.endpoint) {
      showVoteMessage("Voting backend is not configured yet. Paste the Apps Script Web App URL into the page meta tag.", true);
      return;
    }
    state.submitting = true;
    updateSelectionUI();
    showVoteMessage("Submitting vote...", false);

    fingerprintHash().then(function (hash) {
      return jsonp(CONFIG.endpoint, {
        mode: "vote",
        choices: Array.from(state.selected).join(","),
        fingerprintHash: hash,
        userAgent: navigator.userAgent.slice(0, 240)
      });
    }).then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : "Vote failed");
      state.receipt = {
        votedAt: new Date().toISOString(),
        choices: Array.from(state.selected)
      };
      localStorage.setItem(CONFIG.receiptKey, JSON.stringify(state.receipt));
      showThanks();
      renderResults(res.results || [], res.totalVotes || 0);
      showVoteMessage("Vote submitted.", false);
    }).catch(function (err) {
      showVoteMessage(String(err.message || err), true);
    }).finally(function () {
      state.submitting = false;
      updateSelectionUI();
    });
  }

  function loadResults() {
    if (state.resultsLoading || state.resultsLoaded) return;
    if (!CONFIG.endpoint) {
      if (state.phase === "closed" || state.receipt) {
        els.resultsSection.hidden = false;
        els.resultsMeta.textContent = "backend URL needed";
      }
      return;
    }
    state.resultsLoading = true;
    jsonp(CONFIG.endpoint, { mode: "results" })
      .then(function (res) {
        if (!res || !res.ok) throw new Error(res && res.error ? res.error : "Could not load results");
        state.resultsLoaded = true;
        renderResults(res.results || [], res.totalVotes || 0);
      })
      .catch(function (err) {
        els.resultsSection.hidden = false;
        els.resultsMeta.textContent = String(err.message || err);
      })
      .finally(function () {
        state.resultsLoading = false;
      });
  }

  function renderResults(results, totalVotes) {
    var byId = {};
    results.forEach(function (row) { byId[row.id] = row; });
    var rows = TRACKS.map(function (track) {
      var found = byId[track.id] || {};
      var votes = Number(found.votes || 0);
      return {
        id: track.id,
        number: track.number,
        title: found.title || track.title,
        votes: votes,
        percentage: totalVotes > 0 ? votes / totalVotes * 100 : 0
      };
    }).sort(function (a, b) {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.number.localeCompare(b.number);
    });

    els.resultsSection.hidden = false;
    els.resultsMeta.textContent = totalVotes + (totalVotes === 1 ? " vote" : " votes");
    els.resultsList.innerHTML = rows.map(function (row, index) {
      var percent = Math.round(row.percentage);
      var making = index < CONFIG.maxSelections && totalVotes > 0;
      return [
        '<div class="resultRow">',
        '  <div>',
        '    <div class="resultTitle"><span>' + row.number + '. ' + escapeHtml(row.title) + '</span>' + (making ? '<span class="resultBadge">Making the EP</span>' : '') + '</div>',
        '    <div class="resultMeta">' + row.votes + (row.votes === 1 ? " vote" : " votes") + '</div>',
        '  </div>',
        '  <strong>' + percent + '%</strong>',
        '  <div class="resultBar" aria-hidden="true"><div class="resultFill" style="width:' + percent + '%"></div></div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function updatePhase() {
    var now = nowMs();
    if (now < CONFIG.startAt) {
      state.phase = "before";
      els.countdownLabel.textContent = "opens in";
      els.phaseCopy.textContent = "Voting opens May 18, 2026 at 12:00 AM ET.";
      els.countdownValue.textContent = formatDuration(CONFIG.startAt - now);
    } else if (now < CONFIG.endAt) {
      state.phase = "active";
      els.countdownLabel.textContent = "closes in";
      els.phaseCopy.textContent = "Voting is open through May 21, 2026 at 12:00 AM ET.";
      els.countdownValue.textContent = formatDuration(CONFIG.endAt - now);
    } else {
      state.phase = "closed";
      els.countdownLabel.textContent = "status";
      els.phaseCopy.textContent = "Voting is closed. Results are public.";
      els.countdownValue.textContent = "closed";
      loadResults();
    }
    updateSelectionUI();
  }

  function nowMs() {
    if (CONFIG.previewPhase === "active") return CONFIG.startAt + 60000;
    if (CONFIG.previewPhase === "closed") return CONFIG.endAt + 60000;
    if (CONFIG.previewPhase === "before") return CONFIG.startAt - 60000;
    return Date.now();
  }

  function setupMotion() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });

    if (!reduce && finePointer) {
      document.body.classList.add("bw-hideCursor");
      document.body.classList.add("is-fine-pointer");
      var ring = document.getElementById("cursor-ring");
      var dot = document.getElementById("cursor-dot");
      var mx = 0, my = 0, rx = 0, ry = 0, dx = 0, dy = 0;
      window.addEventListener("mousemove", function (e) {
        mx = e.clientX;
        my = e.clientY;
      }, { passive: true });
      function cursorTick() {
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        dx += (mx - dx) * 0.55;
        dy += (my - dy) * 0.55;
        ring.style.transform = "translate(" + rx + "px, " + ry + "px)";
        dot.style.transform = "translate(" + dx + "px, " + dy + "px)";
        requestAnimationFrame(cursorTick);
      }
      cursorTick();
    }

    if (!reduce) {
      document.querySelectorAll(".magnetic").forEach(function (btn) {
        btn.addEventListener("mousemove", function (e) {
          var r = btn.getBoundingClientRect();
          var ox = ((e.clientX - r.left) / r.width - 0.5) * 10;
          var oy = ((e.clientY - r.top) / r.height - 0.5) * 10;
          btn.style.transform = "translate(" + ox + "px, " + oy + "px)";
        });
        btn.addEventListener("mouseleave", function () {
          btn.style.transform = "";
        });
      });
    }
  }

  function updatePlayingUI() {
    TRACKS.forEach(function (track) {
      var card = getCard(track.id);
      var isPlaying = state.currentId === track.id;
      card.classList.toggle("is-playing", isPlaying);
      card.querySelector('[data-action="play"]').textContent = isPlaying ? "Pause" : "Play";
      card.querySelector('[data-role="state"]').textContent = isPlaying ? "playing" : "idle";
    });
  }

  function showThanks() {
    els.thanksPanel.hidden = false;
    els.resultsSection.hidden = false;
  }

  function showSetup(message) {
    els.setupMessage.textContent = message;
    els.setupMessage.hidden = false;
  }

  function showVoteMessage(message, isError) {
    els.voteMessage.textContent = message;
    els.voteMessage.hidden = false;
    els.voteMessage.classList.toggle("is-error", !!isError);
  }

  function jsonp(url, params) {
    return new Promise(function (resolve, reject) {
      var callbackName = "__b2nnyVote" + Date.now() + Math.floor(Math.random() * 10000);
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("Request timed out"));
      }, 12000);

      params.callback = callbackName;
      var query = Object.keys(params).map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      }).join("&");

      window[callbackName] = function (payload) {
        cleanup();
        resolve(payload);
      };

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.onerror = function () {
        cleanup();
        reject(new Error("Backend request failed"));
      };
      script.src = url + (url.indexOf("?") === -1 ? "?" : "&") + query;
      document.head.appendChild(script);
    });
  }

  function fingerprintHash() {
    var raw = [
      navigator.userAgent,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      navigator.platform || ""
    ].join("|");

    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)).then(function (buffer) {
        return Array.from(new Uint8Array(buffer)).map(function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
      });
    }

    return Promise.resolve(String(Math.abs(simpleHash(raw))));
  }

  function simpleHash(input) {
    var hash = 0;
    for (var i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function readReceipt() {
    try {
      var raw = localStorage.getItem(CONFIG.receiptKey);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function findTrack(id) {
    return TRACKS.find(function (track) { return track.id === id; });
  }

  function getCard(id) {
    return document.querySelector('[data-track-id="' + id + '"]');
  }

  function shakeCard(id) {
    var card = getCard(id);
    if (!card) return;
    card.classList.remove("is-shaking");
    void card.offsetWidth;
    card.classList.add("is-shaking");
  }

  function formatDuration(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    if (days > 0) {
      return days + "d " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    }
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
})();
