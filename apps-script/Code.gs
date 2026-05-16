// b2nny EP vote backend (Google Apps Script)
//
// Modes:
// - mode=vote&choices=track-01,track-02,track-03,track-04,track-05&fingerprintHash=...
// - mode=results
//
// NOTE: This script is JSONP-friendly (callback=...) for static site hosting.

// Leave blank to auto-create a spreadsheet on first vote submission.
const VOTE_SHEET_ID = ""; // optional: paste Spreadsheet ID here
const VOTE_SHEET_NAME = "Votes";
const VOTE_START_AT = "2026-05-16T13:45:00-04:00";
const VOTE_END_AT = "2026-05-19T00:00:00-04:00";
const VOTE_TRACKS = [
  { id: "track-01", title: "bad4me (b2nny krovie)" },
  { id: "track-02", title: "block (b2nny)" },
  { id: "track-03", title: "bonnie and clyde (b2nny)" },
  { id: "track-04", title: "bubblegum (rxi)" },
  { id: "track-05", title: "on my life (rxi nvy)" },
  { id: "track-06", title: "shittt (b2nny)" },
  { id: "track-07", title: "slime (rxi 3s lr)" },
  { id: "track-08", title: "ik ik (b2nny)" },
  { id: "track-09", title: "vean (jarii)" },
  { id: "track-10", title: "waste my time (rxi 2ndchances)" }
];

function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const mode = String(p.mode || "").trim().toLowerCase();

    if (!mode) {
      return reply_(e, {
        ok: true,
        message: "ok",
        modes: ["vote", "results"],
        supportsJsonp: true
      });
    }

    if (mode === "vote") {
      return handleVote_(e, p);
    }

    if (mode === "results") {
      return handleResults_(e);
    }

    return reply_(e, { ok: false, error: "Unknown mode" });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const mode = String(p.mode || "").trim().toLowerCase();
    if (mode === "vote") return handleVote_(e, p);
    return reply_(e, { ok: false, error: "Unknown mode" });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
}

function setupVoteBackend() {
  const sh = getVoteSheet_();
  return "Vote sheet ready: " + sh.getName();
}

function handleVote_(e, p) {
  const now = new Date();
  const start = new Date(VOTE_START_AT);
  const end = new Date(VOTE_END_AT);

  if (now.getTime() < start.getTime()) {
    return reply_(e, { ok: false, error: "Voting has not opened yet", startsAt: VOTE_START_AT });
  }

  if (now.getTime() >= end.getTime()) {
    const closedResults = buildVoteResults_();
    return reply_(e, {
      ok: false,
      error: "Voting is closed",
      endedAt: VOTE_END_AT,
      totalVotes: closedResults.totalVotes,
      results: closedResults.results
    });
  }

  const fingerprintHash = String(p.fingerprintHash || "").trim();
  if (!fingerprintHash || fingerprintHash.length < 8) {
    return reply_(e, { ok: false, error: "Missing fingerprint hash" });
  }

  const choices = String(p.choices || "")
    .split(",")
    .map(function (x) { return String(x || "").trim(); })
    .filter(function (x) { return x.length > 0; });

  if (choices.length !== 5) {
    return reply_(e, { ok: false, error: "Pick exactly 5 tracks" });
  }

  const unique = Array.from(new Set(choices));
  if (unique.length !== choices.length) {
    return reply_(e, { ok: false, error: "Duplicate track in choices" });
  }

  const validIds = voteTrackIdSet_();
  for (const id of choices) {
    if (!validIds.has(id)) {
      return reply_(e, { ok: false, error: "Unknown track: " + id });
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sh = getVoteSheet_();
    const values = sh.getDataRange().getValues();
    const idx = values.length ? voteIndexMap_(values[0]) : voteIndexMap_([]);

    for (let r = 1; r < values.length; r++) {
      const existing = String(values[r][idx.fingerprintHash] || "").trim();
      if (existing && existing === fingerprintHash) {
        const duplicateResults = buildVoteResults_();
        return reply_(e, {
          ok: false,
          error: "This browser appears to have already voted",
          results: duplicateResults.results,
          totalVotes: duplicateResults.totalVotes
        });
      }
    }

    sh.appendRow([
      now.toISOString(),
      fingerprintHash,
      choices[0],
      choices[1],
      choices[2],
      choices[3],
      choices[4],
      String(p.userAgent || "").trim().slice(0, 500),
      "v1"
    ]);
  } finally {
    lock.releaseLock();
  }

  const results = buildVoteResults_();
  return reply_(e, {
    ok: true,
    message: "Vote recorded",
    totalVotes: results.totalVotes,
    results: results.results,
    startsAt: VOTE_START_AT,
    endsAt: VOTE_END_AT
  });
}

function handleResults_(e) {
  const results = buildVoteResults_();
  return reply_(e, {
    ok: true,
    totalVotes: results.totalVotes,
    results: results.results,
    startsAt: VOTE_START_AT,
    endsAt: VOTE_END_AT
  });
}

function getVoteSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = VOTE_SHEET_ID || props.getProperty("VOTE_SHEET_ID") || "";

  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create("b2nny EP votes");
    ssId = ss.getId();
    props.setProperty("VOTE_SHEET_ID", ssId);
  }

  let sh = ss.getSheetByName(VOTE_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(VOTE_SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "createdAt",
      "fingerprintHash",
      "choice1",
      "choice2",
      "choice3",
      "choice4",
      "choice5",
      "userAgent",
      "version"
    ]);
  }

  return sh;
}

function buildVoteResults_() {
  const sh = getVoteSheet_();
  const values = sh.getDataRange().getValues();
  const counts = {};
  const validIds = voteTrackIdSet_();

  for (const track of VOTE_TRACKS) {
    counts[track.id] = 0;
  }

  if (values.length <= 1) {
    return {
      totalVotes: 0,
      results: VOTE_TRACKS.map(function (track) {
        return { id: track.id, title: track.title, votes: 0, percentage: 0 };
      })
    };
  }

  const idx = voteIndexMap_(values[0]);
  let totalVotes = 0;
  let totalPicks = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    let countedBallot = false;
    const choices = [
      row[idx.choice1],
      row[idx.choice2],
      row[idx.choice3],
      row[idx.choice4],
      row[idx.choice5]
    ];

    for (const raw of choices) {
      const id = String(raw || "").trim();
      if (validIds.has(id)) {
        counts[id] = (counts[id] || 0) + 1;
        totalPicks++;
        countedBallot = true;
      }
    }

    if (countedBallot) totalVotes++;
  }

  const results = VOTE_TRACKS.map(function (track) {
    const votes = counts[track.id] || 0;
    return {
      id: track.id,
      title: track.title,
      votes: votes,
      percentage: totalPicks > 0 ? votes / totalPicks * 100 : 0
    };
  }).sort(function (a, b) {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.id.localeCompare(b.id);
  });

  return { totalVotes: totalVotes, results: results };
}

function voteTrackIdSet_() {
  const ids = new Set();
  for (const track of VOTE_TRACKS) {
    ids.add(track.id);
  }
  return ids;
}

function voteIndexMap_(headerRow) {
  const m = {};
  for (let i = 0; i < headerRow.length; i++) {
    const k = String(headerRow[i] || "").trim();
    if (k) m[k] = i;
  }
  return {
    createdAt: m.createdAt ?? 0,
    fingerprintHash: m.fingerprintHash ?? 1,
    choice1: m.choice1 ?? 2,
    choice2: m.choice2 ?? 3,
    choice3: m.choice3 ?? 4,
    choice4: m.choice4 ?? 5,
    choice5: m.choice5 ?? 6,
    userAgent: m.userAgent ?? 7,
    version: m.version ?? 8
  };
}

function reply_(e, obj) {
  const p = (e && e.parameter) ? e.parameter : {};
  const callback = String(p.callback || "").trim();

  if (callback) {
    const safeCb = callback.replace(/[^\w.$]/g, "");
    const js = safeCb + "(" + JSON.stringify(obj) + ");";
    return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
