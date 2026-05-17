(function () {
  "use strict";

  var BASE_TRACKS = [
    { id: "track-01", number: "01", src: "/vote/tracks/bad4me%20(prod%20b2nny%20%20krovie).wav" },
    { id: "track-02", number: "02", src: "/vote/tracks/block%20(prod%20b2nny).wav" },
    { id: "track-03", number: "03", src: "/vote/tracks/bonnie%20and%20clyde%20(prod%20b2nny).wav" },
    { id: "track-04", number: "04", src: "/vote/tracks/bubblegum%20(prod%20rxi).wav" },
    { id: "track-05", number: "05", src: "/vote/tracks/on%20my%20life%20(prod%20rxi%20nvy).wav" },
    { id: "track-06", number: "06", src: "/vote/tracks/shittt%20(prod%20b2nny).wav" },
    { id: "track-07", number: "07", src: "/vote/tracks/slime%20(prod%20rxi%203s%20lr).wav" },
    { id: "track-08", number: "08", src: "/vote/tracks/ik%20ik%20(prod%20b2nny).wav" },
    { id: "track-09", number: "09", src: "/vote/tracks/vean%20(prod%20jarii).wav" },
    { id: "track-10", number: "10", src: "/vote/tracks/waste%20my%20time%20(prod%20rxi%202ndchances%20).wav" }
  ];

  BASE_TRACKS.forEach(function (track) {
    track.title = titleFromSrc(track.src);
  });

  var CONFIG = {
    maxSelections: 5,
    unlockSeconds: 15,
    startAt: Date.parse("2026-05-17T14:00:00-04:00"),
    endAt: Date.parse("2026-05-19T00:00:00-04:00"),
    receiptKey: "b2nny_ep_vote_receipt_v1",
    progressKey: "b2nny_ep_vote_listen_progress_v2",
    orderKey: "b2nny_ep_vote_track_order_v1"
  };

  var URL_PARAMS = new URLSearchParams(window.location.search);
  CONFIG.localPreview = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  CONFIG.previewPhase = CONFIG.localPreview ? URL_PARAMS.get("preview") : "";
  CONFIG.testSubmit = CONFIG.localPreview && URL_PARAMS.get("testSubmit") === "1";
  CONFIG.resetVisit = CONFIG.localPreview && URL_PARAMS.get("resetVisit") === "1";
  CONFIG.hadSavedProgress = !CONFIG.resetVisit && !CONFIG.testSubmit && hasSavedListenProgress();

  if (CONFIG.resetVisit) {
    resetLocalVoteState();
  }

  var TRACKS = readTrackOrder();

  var endpointMeta = document.querySelector('meta[name="b2nny-vote-endpoint"]');
  CONFIG.endpoint = endpointMeta ? endpointMeta.getAttribute("content").trim() : "";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;

  var els = {
    trackList: document.getElementById("track-list"),
    trackSection: document.getElementById("tracks"),
    voteBar: document.getElementById("vote-bar"),
    submit: document.getElementById("submit-vote"),
    selectionCount: document.getElementById("selection-count"),
    setupMessage: document.getElementById("setup-message"),
    voteMessage: document.getElementById("vote-message"),
    preopenScreen: document.getElementById("preopen-screen"),
    preopenTimer: document.getElementById("preopen-timer"),
    trackTitle: document.getElementById("track-title"),
    trackHelp: document.getElementById("track-help"),
    progressPath: document.getElementById("progress-path"),
    phaseCopy: document.getElementById("phase-copy"),
    countdownLabel: document.getElementById("countdown-label"),
    countdownValue: document.getElementById("countdown-value"),
    resultsSection: document.getElementById("results"),
    resultsList: document.getElementById("results-list"),
    resultsMeta: document.getElementById("results-meta"),
    thanksPanel: document.getElementById("thanks-panel"),
    resultsTitle: document.getElementById("results-title"),
    progressSummary: document.getElementById("progress-summary"),
    progressDots: document.getElementById("progress-dots"),
    confirmPanel: document.getElementById("confirm-panel"),
    confirmList: document.getElementById("confirm-list"),
    confirmVote: document.getElementById("confirm-vote"),
    editPicks: document.getElementById("edit-picks"),
    themeShuffle: document.getElementById("theme-shuffle")
  };

  var state = {
    selected: new Set(),
    audio: new Map(),
    currentId: "",
    playIntent: "",
    audioContext: null,
    animationFrame: 0,
    lastProgressAt: 0,
    receipt: readReceipt(),
    listenProgress: readListenProgress(),
    phase: "before",
    submitting: false,
    confirming: false,
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
    if (CONFIG.testSubmit) {
      showSetup("Local test submit mode is on. Votes here use fake results and do not touch the live sheet.");
    } else if (CONFIG.resetVisit) {
      showSetup("Local first-visitor reset is on. Saved vote progress was cleared for this browser.");
    }

    if (state.receipt && Array.isArray(state.receipt.choices)) {
      state.receipt.choices.forEach(function (id) {
        if (findTrack(id)) state.selected.add(id);
      });
      showThanks();
    }
    updateResultsHeading();

    els.submit.addEventListener("click", openVoteReview);
    els.confirmVote.addEventListener("click", submitVote);
    els.editPicks.addEventListener("click", closeVoteReview);
    setupThemeShuffle();
    updateSelectionUI();
    showResumeMessage();

    if (state.receipt || state.phase === "closed") {
      loadResults();
    }
  }

  function resetLocalVoteState() {
    try {
      localStorage.removeItem(CONFIG.receiptKey);
      localStorage.removeItem(CONFIG.progressKey);
      localStorage.removeItem(CONFIG.orderKey);
    } catch (err) {}
  }

  function renderTracks() {
    els.trackList.innerHTML = TRACKS.map(function (track) {
      return [
        '<article class="trackCard" data-track-id="' + track.id + '">',
        '  <button class="playButton magnetic" type="button" aria-label="Play ' + escapeHtml(track.title) + '" data-action="play"><span class="playIcon" aria-hidden="true"></span></button>',
        '  <div class="trackMain">',
        '    <div class="trackTopline">',
        '      <div class="trackTitle">' + titleHtml(track.title) + '</div>',
        '      <div class="trackState" data-role="state"><span class="statusDot" aria-hidden="true"></span><span data-role="status-text">locked</span></div>',
        '    </div>',
        '    <p class="lockHint" data-role="lock-hint" hidden>listen to previous track first</p>',
        '    <canvas class="waveform" width="640" height="80" aria-hidden="true"></canvas>',
        '  </div>',
        '  <button class="selectButton magnetic" type="button" data-action="select">Select</button>',
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
    });
    updateTrackAccessUI();
  }

  function playTrack(id, intent) {
    var track = findTrack(id);
    if (!track) return;
    if (!canPlayTrack(id)) {
      shakeCard(id);
      showVoteMessage(state.receipt ? "After voting, only your 5 picks can be replayed." : "Listen in order. This track unlocks after the previous one gets 15 seconds.", false);
      return;
    }
    if (!state.receipt && !isTrackUnlocked(id)) {
      shakeCard(id);
      showVoteMessage("Listen in order. This track unlocks after the previous one gets 15 seconds.", false);
      return;
    }
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
          state.lastProgressAt = performance.now();
          fadeVolume(item.audio, 1, 180);
          startWaveAnimation();
        })
        .catch(function () {
          state.currentId = "";
          state.playIntent = "";
          state.lastProgressAt = 0;
          updatePlayingUI();
          showVoteMessage("Could not start audio. Press play again, or check that the file exists.", false);
        });
    } else {
      state.lastProgressAt = performance.now();
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
      state.lastProgressAt = 0;
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
      updateListeningProgress(performance.now());
      state.currentId = "";
      state.playIntent = "";
      state.lastProgressAt = 0;
      updatePlayingUI();
      updateTrackAccessUI();
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
        item.analyser.fftSize = 256;
        item.data = new Uint8Array(item.analyser.fftSize);
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

    function frame() {
      state.animationFrame = requestAnimationFrame(frame);
      if (!state.currentId) return;
      updateListeningProgress(performance.now());
      var item = state.audio.get(state.currentId);
      var card = getCard(state.currentId);
      if (!item || !card) return;
      var canvas = card.querySelector("canvas");
      var ctx = canvas.getContext("2d");
      var w = canvas.width;
      var h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!item.analyser || !item.data) {
        drawFallbackWave(canvas, state.currentId, performance.now() / 500);
        return;
      }

      item.analyser.getByteTimeDomainData(item.data);
      var colors = getWaveformColors();
      ctx.strokeStyle = colors.guide;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.strokeStyle = colors.active;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (var i = 0; i < item.data.length; i++) {
        var x = i / (item.data.length - 1) * w;
        var value = (item.data[i] - 128) / 128;
        var y = h / 2 + value * h * 0.36;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    frame();
  }

  function getWaveformColors() {
    var styles = getComputedStyle(document.documentElement);
    return {
      guide: styles.getPropertyValue("--line").trim() || "#d4d4d4",
      idle: styles.getPropertyValue("--accent-strong").trim() || "#6f6f6f",
      active: styles.getPropertyValue("--accent").trim() || "#101010"
    };
  }

  function drawFallbackWave(canvas, seed, phase) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    var colors = getWaveformColors();
    var n = 72;
    var hash = 0;
    for (var c = 0; c < seed.length; c++) hash = (hash * 31 + seed.charCodeAt(c)) % 9973;
    var p = Number(phase || 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = colors.guide;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = phase ? colors.active : colors.idle;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var x = i / (n - 1) * w;
      var wave = Math.sin((i + hash) * 0.38 + p) * 0.55 + Math.sin((i + hash) * 0.13 + p * 0.6) * 0.45;
      var y = h / 2 + wave * h * 0.22;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function toggleSelection(id) {
    if (state.receipt || state.phase !== "active") {
      showVoteMessage(state.phase === "before" ? "Voting has not opened yet." : "Voting is closed on this browser.", false);
      return;
    }
    if (!isTrackUnlocked(id)) {
      shakeCard(id);
      showVoteMessage("That track is locked until you listen through the sequence.", false);
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
    state.confirming = false;
    updateSelectionUI();
  }

  function updateSelectionUI() {
    var count = state.selected.size;
    els.selectionCount.textContent = count + " of " + CONFIG.maxSelections + " selected";
    els.submit.disabled = state.submitting || state.phase !== "active" || count !== CONFIG.maxSelections || !!state.receipt;
    els.submit.textContent = state.confirming ? "Review open" : "Submit vote";
    els.voteBar.hidden = state.phase === "closed" || !!state.receipt;

    TRACKS.forEach(function (track) {
      var card = getCard(track.id);
      var selected = state.selected.has(track.id);
      var unlocked = isTrackUnlocked(track.id);
      var select = card.querySelector('[data-action="select"]');
      card.classList.toggle("is-selected", selected);
      card.classList.toggle("is-soft-disabled", count >= CONFIG.maxSelections && !selected && !state.receipt && unlocked);
      select.classList.toggle("is-selected", selected);
      select.textContent = selected ? "Selected" : "Select";
      select.disabled = state.phase !== "active" || !!state.receipt || !unlocked;
    });
    renderVoteReview();
    updatePostVoteTrackView();
    updateTrackAccessUI();
  }

  function updateTrackAccessUI() {
    var postVote = isPostVoteView();
    TRACKS.forEach(function (track, index) {
      var card = getCard(track.id);
      if (!card) return;
      var unlocked = isTrackUnlocked(track.id);
      var selected = state.selected.has(track.id);
      var playable = canPlayTrack(track.id);
      var complete = isTrackComplete(track.id);
      var isLast = index === TRACKS.length - 1;
      var remaining = Math.ceil(Math.max(0, CONFIG.unlockSeconds - getListenedSeconds(track.id)));
      var play = card.querySelector('[data-action="play"]');
      var stateEl = card.querySelector('[data-role="state"]');
      var statusText = card.querySelector('[data-role="status-text"]');
      var lockHint = card.querySelector('[data-role="lock-hint"]');

      card.hidden = postVote && !selected;
      card.classList.toggle("is-receipt-pick", postVote && selected);
      card.classList.toggle("is-locked", !playable);
      card.classList.toggle("is-vote-locked", !!state.receipt && !selected);
      card.classList.toggle("is-listen-complete", complete);

      if (play) {
        play.disabled = !playable;
        play.setAttribute("aria-label", (playable ? "Play " : "Locked ") + track.title);
      }

      if (stateEl) {
        stateEl.classList.toggle("is-locked", !playable);
        stateEl.classList.toggle("is-complete", complete);
        stateEl.classList.toggle("is-playing", state.currentId === track.id);
      }

      if (statusText) {
        if (state.receipt && !selected) {
          statusText.textContent = "not picked";
        } else if (state.receipt && selected) {
          statusText.textContent = "your pick";
        } else if (!unlocked) {
          statusText.textContent = "locked";
        } else if (complete || isLast) {
          statusText.textContent = "unlocked";
        } else if (state.currentId === track.id) {
          statusText.textContent = remaining + "s left";
        } else {
          statusText.textContent = remaining + "s left";
        }
      }

      if (lockHint) {
        if (state.receipt && !selected) {
          lockHint.textContent = "only your 5 picks can replay";
          lockHint.hidden = false;
        } else {
          lockHint.textContent = "listen to previous track first";
          lockHint.hidden = unlocked;
        }
      }

      var select = card.querySelector('[data-action="select"]');
      if (select) {
        select.hidden = postVote;
      }
    });
    updateProgressPath();
  }

  function updateListeningProgress(now) {
    if (!state.currentId) return;
    var item = state.audio.get(state.currentId);
    if (!item || item.audio.paused || item.audio.ended) {
      state.lastProgressAt = now;
      return;
    }
    if (!state.lastProgressAt) {
      state.lastProgressAt = now;
      return;
    }

    var delta = Math.max(0, Math.min(0.5, (now - state.lastProgressAt) / 1000));
    state.lastProgressAt = now;
    if (!delta) return;

    var previous = getListenedSeconds(state.currentId);
    if (previous >= CONFIG.unlockSeconds) return;

    state.listenProgress.seconds[state.currentId] = Math.min(CONFIG.unlockSeconds, previous + delta);

    if (state.listenProgress.seconds[state.currentId] >= CONFIG.unlockSeconds) {
      unlockNextTrack(state.currentId);
    }

    saveListenProgress();
    updateTrackAccessUI();
    updateSelectionUI();
  }

  function unlockNextTrack(id) {
    var index = getTrackIndex(id);
    if (index >= 0 && index < TRACKS.length - 1) {
      var nextId = TRACKS[index + 1].id;
      if (!state.listenProgress.unlocked[nextId]) {
        state.listenProgress.unlocked[nextId] = true;
        animateUnlockedTrack(nextId);
      }
    }
  }

  function animateUnlockedTrack(id) {
    var card = getCard(id);
    if (!card || reduce) return;
    card.classList.remove("is-unlock-reveal");
    void card.offsetWidth;
    card.classList.add("is-unlock-reveal");
    window.setTimeout(function () {
      card.classList.remove("is-unlock-reveal");
    }, 1200);
  }

  function isTrackUnlocked(id) {
    return !!state.listenProgress.unlocked[id];
  }

  function canPlayTrack(id) {
    if (state.receipt) return state.selected.has(id);
    return isTrackUnlocked(id);
  }

  function isTrackComplete(id) {
    return getListenedSeconds(id) >= CONFIG.unlockSeconds;
  }

  function getListenedSeconds(id) {
    return Math.max(0, Number(state.listenProgress.seconds[id] || 0));
  }

  function getTrackIndex(id) {
    for (var i = 0; i < TRACKS.length; i++) {
      if (TRACKS[i].id === id) return i;
    }
    return -1;
  }

  function isPostVoteView() {
    return !!state.receipt && state.phase !== "closed";
  }

  function updatePostVoteTrackView() {
    var postVote = isPostVoteView();
    if (els.trackSection) {
      els.trackSection.classList.toggle("is-post-vote", postVote);
    }
    if (els.trackTitle) {
      els.trackTitle.textContent = postVote ? "Your 5 picks" : "tracks";
    }
    if (els.trackHelp) {
      els.trackHelp.textContent = postVote ? "personal preview" : "play in order";
    }
    if (state.currentId && postVote && !state.selected.has(state.currentId)) {
      stopTrack(state.currentId, true);
    }
  }

  function updateProgressPath() {
    if (!els.progressSummary || !els.progressDots) return;
    if (isPostVoteView()) {
      if (els.progressPath) els.progressPath.classList.add("is-receipt");
      els.progressSummary.textContent = "Thanks for voting. Your 5 picks are below.";
      els.progressDots.hidden = true;
      return;
    }
    if (els.progressPath) els.progressPath.classList.remove("is-receipt");
    els.progressDots.hidden = false;
    var unlockedCount = getUnlockedCount();
    els.progressSummary.textContent = unlockedCount + " / " + TRACKS.length + " unlocked";
    els.progressDots.innerHTML = TRACKS.map(function (track, index) {
      var classes = ["progressDot"];
      if (isTrackUnlocked(track.id)) classes.push("is-unlocked");
      if (isTrackComplete(track.id)) classes.push("is-complete");
      if (state.currentId === track.id) classes.push("is-current");
      var label = "Track " + (index + 1) + ": ";
      label += isTrackUnlocked(track.id) ? "unlocked" : "locked";
      if (isTrackComplete(track.id)) label = "Track " + (index + 1) + ": completed";
      if (state.currentId === track.id) label = "Track " + (index + 1) + ": playing";
      return '<span class="' + classes.join(" ") + '" aria-label="' + label + '"></span>';
    }).join("");
  }

  function getUnlockedCount() {
    return TRACKS.reduce(function (count, track) {
      return count + (isTrackUnlocked(track.id) ? 1 : 0);
    }, 0);
  }

  function hasMeaningfulProgress() {
    return TRACKS.some(function (track) {
      return getListenedSeconds(track.id) > 0;
    }) || getUnlockedCount() > 1;
  }

  function showResumeMessage() {
    if (!CONFIG.hadSavedProgress || state.receipt || state.phase === "closed" || !hasMeaningfulProgress()) return;
    showVoteMessage("Welcome back. Track " + getUnlockedCount() + " is unlocked.", false);
  }

  function openVoteReview() {
    if (state.submitting || state.selected.size !== CONFIG.maxSelections || state.receipt) return;
    state.confirming = true;
    renderVoteReview();
    updateSelectionUI();
  }

  function closeVoteReview() {
    state.confirming = false;
    renderVoteReview();
    updateSelectionUI();
  }

  function renderVoteReview() {
    if (!els.confirmPanel || !els.confirmList) return;
    var shouldShow = state.confirming && state.phase === "active" && !state.receipt && state.selected.size === CONFIG.maxSelections;
    els.confirmPanel.hidden = !shouldShow;
    if (!shouldShow) return;
    els.confirmList.innerHTML = Array.from(state.selected).map(function (id) {
      var track = findTrack(id);
      return '<li>' + titleHtml(track ? track.title : id) + '</li>';
    }).join("");
    els.confirmVote.disabled = state.submitting;
    els.confirmVote.textContent = state.submitting ? "Submitting..." : "Confirm vote";
  }

  function submitVote() {
    if (state.submitting || state.selected.size !== CONFIG.maxSelections) return;
    if (!CONFIG.endpoint && !CONFIG.testSubmit) {
      showVoteMessage("Voting backend is not configured yet. Paste the Apps Script Web App URL into the page meta tag.", true);
      return;
    }
    state.submitting = true;
    state.confirming = true;
    updateSelectionUI();
    showVoteMessage("Submitting vote...", false);

    fingerprintHash().then(function (hash) {
      var params = {
        mode: "vote",
        choices: Array.from(state.selected).join(","),
        fingerprintHash: hash,
        userAgent: navigator.userAgent.slice(0, 240)
      };
      return CONFIG.testSubmit ? Promise.resolve(mockVoteResponse(Array.from(state.selected))) : jsonp(CONFIG.endpoint, params);
    }).then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : "Vote failed");
      state.receipt = {
        votedAt: new Date().toISOString(),
        choices: Array.from(state.selected)
      };
      if (!CONFIG.testSubmit) {
        localStorage.setItem(CONFIG.receiptKey, JSON.stringify(state.receipt));
      }
      state.confirming = false;
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
    if (CONFIG.testSubmit) {
      state.resultsLoaded = true;
      renderResults(mockVoteResponse(state.receipt && state.receipt.choices ? state.receipt.choices : []).results, 12);
      return;
    }
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
    var totalPicks = 0;
    results.forEach(function (row) {
      totalPicks += Number(row.votes || 0);
    });
    var rows = TRACKS.map(function (track) {
      var found = byId[track.id] || {};
      var votes = Number(found.votes || 0);
      return {
        id: track.id,
        number: track.number,
        title: track.title || found.title,
        votes: votes,
        percentage: totalPicks > 0 ? votes / totalPicks * 100 : 0
      };
    }).sort(function (a, b) {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.number.localeCompare(b.number);
    });
    applyDisplayPercentages(rows);
    if (state.phase === "closed") {
      renderClosedLeaderboard(rows, totalVotes);
      return;
    }

    els.resultsSection.hidden = false;
    els.resultsSection.classList.remove("is-final-board");
    els.resultsMeta.textContent = "percent standings";
    els.resultsList.innerHTML = rows.map(function (row, index) {
      var percent = row.displayPercentage;
      return [
        '<div class="resultRow">',
        '  <div>',
        '    <div class="resultTitle">' + titleHtml(row.title) + '</div>',
        '  </div>',
        '  <strong>' + percent + '%</strong>',
        '  <div class="resultBar" aria-hidden="true"><div class="resultFill" style="width:' + Math.min(100, percent) + '%"></div></div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function renderClosedLeaderboard(rows, totalVotes) {
    var topRows = rows.slice(0, CONFIG.maxSelections);
    els.resultsSection.hidden = false;
    els.resultsSection.classList.add("is-final-board");
    els.thanksPanel.hidden = true;
    els.resultsMeta.textContent = "percent standings";
    els.resultsList.innerHTML = [
      '<div class="leaderHero">',
      '  <span class="leaderLabel">final tracklist</span>',
      '  <strong>Final EP Lineup</strong>',
      '  <span>The voting window has ended. These 5 tracks move forward.</span>',
      '</div>'
    ].join("") + topRows.map(function (row, index) {
      return [
        '<div class="leaderRow' + (index === 0 ? " is-winner" : "") + '" style="--rank-delay:' + (index * 80) + 'ms">',
        '  <span class="leaderRank">#' + (index + 1) + '</span>',
        '  <div class="leaderMain">',
        '    <div class="leaderTitle">' + titleHtml(row.title) + '</div>',
        '  </div>',
        '  <strong class="leaderPercent">' + row.displayPercentage + '%</strong>',
        '</div>'
      ].join("");
    }).join("");
  }

  function applyDisplayPercentages(rows) {
    var total = rows.reduce(function (sum, row) {
      return sum + row.percentage;
    }, 0);
    if (total <= 0) {
      rows.forEach(function (row) { row.displayPercentage = 0; });
      return;
    }

    var floorSum = 0;
    rows.forEach(function (row) {
      row.displayPercentage = Math.floor(row.percentage);
      row.percentRemainder = row.percentage - row.displayPercentage;
      floorSum += row.displayPercentage;
    });

    var pointsLeft = Math.max(0, Math.min(rows.length, 100 - floorSum));
    rows.slice().sort(function (a, b) {
      if (b.percentRemainder !== a.percentRemainder) return b.percentRemainder - a.percentRemainder;
      return b.votes - a.votes;
    }).slice(0, pointsLeft).forEach(function (row) {
      row.displayPercentage += 1;
    });
  }

  function mockVoteResponse(choices) {
    var chosen = new Set(choices || []);
    var results = TRACKS.map(function (track, index) {
      return {
        id: track.id,
        title: track.title,
        votes: chosen.has(track.id) ? 9 + (TRACKS.length - index) : Math.max(0, TRACKS.length - index - 2),
        percentage: 0
      };
    });
    return {
      ok: true,
      message: "Test vote recorded",
      totalVotes: 12,
      results: results
    };
  }

  function updatePhase() {
    var previousPhase = state.phase;
    var now = nowMs();
    if (now < CONFIG.startAt) {
      state.phase = "before";
      els.countdownLabel.textContent = "opens in";
      els.phaseCopy.textContent = "Voting opens May 17, 2026 at 2:00 PM ET.";
      var timeUntilOpen = formatDuration(CONFIG.startAt - now);
      els.countdownValue.textContent = timeUntilOpen;
      if (els.preopenTimer) els.preopenTimer.textContent = timeUntilOpen;
    } else if (now < CONFIG.endAt) {
      state.phase = "active";
      els.countdownLabel.textContent = "closes in";
      els.phaseCopy.textContent = "Voting is open through May 19, 2026 at 12:00 AM ET.";
      els.countdownValue.textContent = formatDuration(CONFIG.endAt - now);
      if (els.preopenTimer) els.preopenTimer.textContent = "00:00:00";
    } else {
      state.phase = "closed";
      els.countdownLabel.textContent = "status";
      els.phaseCopy.textContent = "Voting is closed. Results are public.";
      els.countdownValue.textContent = "closed";
      if (els.preopenTimer) els.preopenTimer.textContent = "closed";
      loadResults();
    }
    updatePreopenScreen();
    updateClosedPhaseLayout();
    updateResultsHeading();
    updateSelectionUI();
    updateTrackAccessUI();
  }

  function updateClosedPhaseLayout() {
    if (!els.trackSection) return;
    if (state.phase === "closed") {
      els.trackSection.hidden = true;
      els.voteBar.hidden = true;
      return;
    }
    if (state.phase === "before") {
      els.trackSection.hidden = true;
      els.voteBar.hidden = true;
      return;
    }
    els.trackSection.hidden = false;
  }

  function updatePreopenScreen() {
    var main = document.getElementById("top");
    if (!els.preopenScreen || !main) return;
    var isPreopen = state.phase === "before";
    els.preopenScreen.hidden = !isPreopen;
    main.hidden = isPreopen;
    document.body.classList.toggle("is-preopen", isPreopen);
  }

  function updateResultsHeading() {
    if (!els.resultsTitle) return;
    if (state.phase === "closed") {
      els.resultsTitle.textContent = "final EP leaderboard";
      els.thanksPanel.hidden = true;
      return;
    }
    els.resultsTitle.textContent = "results";
    if (state.receipt) {
      els.resultsTitle.textContent = "live results";
      els.thanksPanel.hidden = true;
    }
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
          if (btn.disabled) return;
          var r = btn.getBoundingClientRect();
          var ox = ((e.clientX - r.left) / r.width - 0.5) * 8;
          var oy = ((e.clientY - r.top) / r.height - 0.5) * 8;
          btn.style.transform = "translate(" + ox + "px, " + oy + "px)";
        });
        btn.addEventListener("mouseleave", function () {
          btn.style.transform = "";
        });
        btn.addEventListener("pointerdown", function () {
          if (btn.disabled) return;
          btn.classList.remove("is-pressed");
          void btn.offsetWidth;
          btn.classList.add("is-pressed");
        });
        btn.addEventListener("animationend", function () {
          btn.classList.remove("is-pressed");
        });
      });
    }
  }

  function setupThemeShuffle() {
    if (!els.themeShuffle || !CONFIG.localPreview) return;
    els.themeShuffle.hidden = false;
    els.themeShuffle.addEventListener("click", function () {
      var params = new URLSearchParams(window.location.search);
      var current = Number(params.get("theme") || 0);
      var next = Math.floor(Math.random() * 100) + 1;
      if (next === current) next = next === 100 ? 1 : next + 1;
      params.set("theme", String(next));
      window.location.search = params.toString();
    });
  }

  function updatePlayingUI() {
    TRACKS.forEach(function (track) {
      var card = getCard(track.id);
      var isPlaying = state.currentId === track.id;
      card.classList.toggle("is-playing", isPlaying);
      card.querySelector('[data-action="play"]').setAttribute("aria-label", (isPlaying ? "Pause " : "Play ") + track.title);
    });
    updateTrackAccessUI();
  }

  function showThanks() {
    els.thanksPanel.hidden = true;
    els.resultsSection.hidden = false;
    updatePostVoteTrackView();
    updateProgressPath();
    updateResultsHeading();
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

  function hasSavedListenProgress() {
    try {
      var raw = localStorage.getItem(CONFIG.progressKey);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed) return false;
      if (parsed.seconds) {
        for (var id in parsed.seconds) {
          if (Number(parsed.seconds[id]) > 0) return true;
        }
      }
      return Array.isArray(parsed.unlocked) && parsed.unlocked.length > 1;
    } catch (err) {
      return false;
    }
  }

  function readReceipt() {
    if (CONFIG.testSubmit) return null;
    try {
      var raw = localStorage.getItem(CONFIG.receiptKey);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function readListenProgress() {
    var progress = { seconds: {}, unlocked: {} };
    if (TRACKS.length) progress.unlocked[TRACKS[0].id] = true;

    if (CONFIG.testSubmit) {
      TRACKS.forEach(function (track) {
        progress.unlocked[track.id] = true;
        progress.seconds[track.id] = CONFIG.unlockSeconds;
      });
      return progress;
    }

    try {
      var raw = localStorage.getItem(CONFIG.progressKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.seconds) {
          TRACKS.forEach(function (track) {
            var value = Number(parsed.seconds[track.id] || 0);
            if (Number.isFinite(value) && value > 0) {
              progress.seconds[track.id] = Math.min(CONFIG.unlockSeconds, value);
            }
          });
        }
        if (parsed && Array.isArray(parsed.unlocked)) {
          parsed.unlocked.forEach(function (id) {
            if (findTrack(id)) progress.unlocked[id] = true;
          });
        }
      }
    } catch (err) {}

    TRACKS.forEach(function (track, index) {
      if (index < TRACKS.length - 1 && progress.seconds[track.id] >= CONFIG.unlockSeconds) {
        progress.unlocked[TRACKS[index + 1].id] = true;
      }
    });

    return progress;
  }

  function readTrackOrder() {
    var byId = {};
    BASE_TRACKS.forEach(function (track) {
      byId[track.id] = track;
    });

    try {
      var raw = localStorage.getItem(CONFIG.orderKey);
      var ids = raw ? JSON.parse(raw) : null;
      if (Array.isArray(ids) && ids.length === BASE_TRACKS.length) {
        var seen = {};
        var ordered = [];
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          if (!byId[id] || seen[id]) {
            ordered = [];
            break;
          }
          seen[id] = true;
          ordered.push(byId[id]);
        }
        if (ordered.length === BASE_TRACKS.length) {
          return applyDisplayNumbers(ordered);
        }
      }
    } catch (err) {}

    var shuffled = shuffleTracks(BASE_TRACKS.slice());
    saveTrackOrder(shuffled);
    return applyDisplayNumbers(shuffled);
  }

  function shuffleTracks(tracks) {
    for (var i = tracks.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = tracks[i];
      tracks[i] = tracks[j];
      tracks[j] = tmp;
    }
    return tracks;
  }

  function saveTrackOrder(tracks) {
    try {
      localStorage.setItem(CONFIG.orderKey, JSON.stringify(tracks.map(function (track) {
        return track.id;
      })));
    } catch (err) {}
  }

  function applyDisplayNumbers(tracks) {
    return tracks.map(function (track, index) {
      var copy = {};
      Object.keys(track).forEach(function (key) {
        copy[key] = track[key];
      });
      copy.number = pad(index + 1);
      return copy;
    });
  }

  function saveListenProgress() {
    try {
      localStorage.setItem(CONFIG.progressKey, JSON.stringify({
        seconds: state.listenProgress.seconds,
        unlocked: Object.keys(state.listenProgress.unlocked).filter(function (id) {
          return state.listenProgress.unlocked[id];
        })
      }));
    } catch (err) {}
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

  function titleHtml(title) {
    var parts = splitTitle(title);
    var html = '<span class="trackTitleMain">' + escapeHtml(parts.main) + '</span>';
    if (parts.meta) {
      html += '<span class="trackTitleMeta">' + escapeHtml(parts.meta) + '</span>';
    }
    return html;
  }

  function splitTitle(title) {
    var value = String(title || "").replace(/\s+/g, " ").trim();
    var match = value.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!match) {
      return { main: value || "Untitled", meta: "" };
    }
    return {
      main: match[1].trim() || "Untitled",
      meta: match[2].replace(/\s+/g, " ").trim().replace(/^prod\s+/i, "")
    };
  }

  function titleFromSrc(src) {
    var file = String(src || "").split("/").pop() || "";
    var decoded = file;
    try {
      decoded = decodeURIComponent(file);
    } catch (err) {}
    return decoded
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled";
  }

  init();
})();
