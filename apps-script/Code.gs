// b2nny booking backend (Google Apps Script)
// Adds: mode=waitlist + notifyWaitlist_() for auto-notify via email
//
// NOTE: This script is JSONP-friendly (callback=...) for static site hosting.

const CALENDAR_ID = "79dda8c7202da2b6bca0325606f2308c71d8cad460e48b1f48cf09a45dea966c@group.calendar.google.com";
const RATE_PER_HOUR = 50;
const ALLOW_ORIGIN = "https://b2nny.com";

// Waitlist storage
// Leave blank to auto-create a spreadsheet on first waitlist submission.
const WAITLIST_SHEET_ID = ""; // optional: paste Spreadsheet ID here
const WAITLIST_SHEET_NAME = "Waitlist";

// Notification behavior
const BOOKING_LINK = "https://b2nny.com/#book";
const NOTIFY_LOOKAHEAD_DAYS = 21;
const NOTIFY_COOLDOWN_HOURS = 24;

function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const mode = String(p.mode || "").trim().toLowerCase();

    if (!mode) {
      return reply_(e, {
        ok: true,
        message: "ok",
        modes: ["busy", "book", "waitlist"],
        supportsJsonp: true
      });
    }

    if (mode === "busy") {
      const date = String(p.date || "").trim();
      if (!date) return reply_(e, { ok: false, error: "Missing date" });

      const cal = CalendarApp.getCalendarById(CALENDAR_ID);
      if (!cal) return reply_(e, { ok: false, error: "Calendar not found" });

      const info = busyForDate_(cal, date);
      return reply_(e, { ok: true, date, busy: Array.from(info.busy) });
    }

    if (mode === "book") {
      return handleBooking_(e, p);
    }

    if (mode === "waitlist") {
      return handleWaitlist_(e, p);
    }

    return reply_(e, { ok: false, error: "Unknown mode" });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    // If you want to post JSON, you can parse e.postData.contents here.
    return handleBooking_(e, p);
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
}

function handleBooking_(e, p) {
  const required = ["name", "email", "phone", "instagram", "date", "time", "durationMinutes"];
  for (const k of required) {
    if (!p[k] || String(p[k]).trim().length === 0) {
      return reply_(e, { ok: false, error: "Missing field: " + k });
    }
  }

  const durationMinutes = Number(p.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 60 || durationMinutes % 60 !== 0) {
    return reply_(e, { ok: false, error: "Duration must be in 60 minute blocks" });
  }

  const date = String(p.date).trim();
  const time = String(p.time).trim();

  const start = parseLocalDateTimeHourOnly_(date, time);
  if (!start) return reply_(e, { ok: false, error: "Bad date or time" });

  const end = new Date(start.getTime() + durationMinutes * 60000);

  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) return reply_(e, { ok: false, error: "Calendar not found" });

  const conflicts = cal.getEvents(start, end);
  if (conflicts && conflicts.length > 0) {
    return reply_(e, { ok: false, error: "That time range is already booked" });
  }

  const hours = Math.round(durationMinutes / 60);
  const total = hours * RATE_PER_HOUR;

  const title = "Studio Session " + hours + "h | " + String(p.name).trim();

  // Optional fields from frontend
  const minHours = String(p.minHours || "").trim();
  const agreedRules = String(p.agreedRules || "").trim();
  const depositAmount = String(p.depositAmount || "").trim();

  const descLines = [
    "New booking request",
    "",
    "Name: " + String(p.name).trim(),
    "Email: " + String(p.email).trim(),
    "Phone: " + String(p.phone).trim(),
    "Instagram: " + String(p.instagram).trim(),
    "Date: " + date,
    "Start: " + time,
    "Hours: " + hours,
    "Rate: $" + RATE_PER_HOUR + "/hr",
    "Total: $" + total,
    "",
    "Frontend flags:",
    "Min hours requirement: " + (minHours || "(not provided)"),
    "Agreed rules: " + (agreedRules || "(not provided)"),
    "Deposit amount (optional): " + (depositAmount || "(not provided)"),
    "",
    "Notes:",
    String(p.notes || "").trim()
  ];

  const event = cal.createEvent(title, start, end, { description: descLines.join("\n") });

  return reply_(e, {
    ok: true,
    message: "Request received. I will contact you to confirm.",
    eventId: event.getId(),
    start: start.toISOString(),
    end: end.toISOString(),
    hours,
    total
  });
}

function handleWaitlist_(e, p) {
  const date = String(p.date || "").trim();
  const hours = Number(p.hours);
  const email = String(p.email || "").trim();
  const phone = String(p.phone || "").trim();
  const instagram = String(p.instagram || "").trim();

  if (!date) return reply_(e, { ok: false, error: "Missing date" });
  if (!Number.isFinite(hours) || hours < 1 || hours > 8) return reply_(e, { ok: false, error: "Bad hours" });
  if (!email && !phone && !instagram) return reply_(e, { ok: false, error: "Missing contact (email/phone/instagram)" });

  // Basic rate limit (per IP-ish via user cache key; imperfect but helps)
  try {
    const cache = CacheService.getScriptCache();
    const key = "wl:" + Utilities.base64EncodeWebSafe((email || phone || instagram) + "|" + date);
    const hit = cache.get(key);
    if (hit) return reply_(e, { ok: false, error: "Already on waitlist for that date" });
    cache.put(key, "1", 60 * 15); // 15 min
  } catch (err) {}

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sh = getWaitlistSheet_();
    const now = new Date();
    sh.appendRow([
      now.toISOString(),
      "active",
      date,
      hours,
      email,
      phone,
      instagram,
      "", // lastNotifiedAt
      ""  // notes
    ]);
  } finally {
    lock.releaseLock();
  }

  // Optional confirmation email
  if (email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: "b2nny waitlist — " + date,
        body:
          "You're on the waitlist for " + date + " (" + hours + "h).\n\n" +
          "If a slot opens, you'll get notified.\n\n" +
          "Booking link: " + BOOKING_LINK + "\n"
      });
    } catch (err) {}
  }

  const note = email ? "" : " (add an email for automatic notifications)";
  return reply_(e, { ok: true, message: "Added to waitlist" + note, date, hours });
}

/**
 * Time-based trigger entrypoint.
 * Create a trigger in Apps Script:
 * Triggers -> Add Trigger -> notifyWaitlist -> Time-driven -> every 10/30 minutes.
 */
function notifyWaitlist() {
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error("Calendar not found");

  const sh = getWaitlistSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return;

  const header = values[0];
  const idx = indexMap_(header);

  const now = new Date();
  const lookaheadEnd = new Date(now.getTime() + NOTIFY_LOOKAHEAD_DAYS * 24 * 60 * 60000);
  const cooldownMs = NOTIFY_COOLDOWN_HOURS * 60 * 60000;

  const updates = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const status = String(row[idx.status] || "").trim().toLowerCase();
    if (status !== "active") continue;

    const date = String(row[idx.date] || "").trim();
    const hours = Number(row[idx.hours]);
    const email = String(row[idx.email] || "").trim();
    const lastNotifiedAt = String(row[idx.lastNotifiedAt] || "").trim();

    if (!date || !Number.isFinite(hours) || hours < 1) continue;
    if (!email) continue; // email-only auto notify

    const dayStart = new Date(date + "T00:00:00");
    if (dayStart.getTime() < now.getTime() - 24 * 60 * 60000) continue;
    if (dayStart.getTime() > lookaheadEnd.getTime()) continue;

    if (lastNotifiedAt) {
      const t = new Date(lastNotifiedAt);
      if (Number.isFinite(t.getTime()) && (now.getTime() - t.getTime()) < cooldownMs) {
        continue;
      }
    }

    const info = busyForDate_(cal, date);
    const window = findAvailableWindow_(info.busy, hours);
    if (!window) continue;

    // Notify
    try {
      MailApp.sendEmail({
        to: email,
        subject: "b2nny — slot opened on " + date,
        body:
          "A slot may be available on " + date + " for ~" + hours + "h.\n\n" +
          "Suggested window: " + window.startLabel + " to " + window.endLabel + "\n\n" +
          "Book here: " + BOOKING_LINK + "\n\n" +
          "Reply to confirm and I’ll lock it in."
      });
    } catch (err) {
      continue;
    }

    updates.push({ row: r + 1, lastNotifiedAt: now.toISOString() });
  }

  // Write updates
  for (const u of updates) {
    sh.getRange(u.row, idx.lastNotifiedAt + 1).setValue(u.lastNotifiedAt);
  }
}

function findAvailableWindow_(busySet, hoursNeeded) {
  const startHour = 11;
  const endHour = 23;

  for (let h = startHour; h + hoursNeeded <= endHour; h++) {
    let ok = true;
    for (let x = 0; x < hoursNeeded; x++) {
      if (busySet.has(timeLabel_(h + x))) { ok = false; break; }
    }
    if (ok) {
      return { startLabel: timeLabel_(h), endLabel: timeLabel_(h + hoursNeeded) };
    }
  }
  return null;
}

function busyForDate_(cal, date) {
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");
  const events = cal.getEvents(dayStart, dayEnd);

  const busy = new Set();
  for (const ev of events) {
    const st = ev.getStartTime();
    const en = ev.getEndTime();

    let cur = new Date(st.getTime());
    cur.setMinutes(0, 0, 0);
    if (cur.getTime() > st.getTime()) cur = new Date(cur.getTime() - 60 * 60000);

    while (cur.getTime() < en.getTime()) {
      busy.add(formatTimeLabelHourOnly_(cur));
      cur = new Date(cur.getTime() + 60 * 60000);
    }
  }
  return { busy };
}

function getWaitlistSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = WAITLIST_SHEET_ID || props.getProperty("WAITLIST_SHEET_ID") || "";

  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create("b2nny waitlist");
    ssId = ss.getId();
    props.setProperty("WAITLIST_SHEET_ID", ssId);
  }

  let sh = ss.getSheetByName(WAITLIST_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(WAITLIST_SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "createdAt",
      "status",
      "date",
      "hours",
      "email",
      "phone",
      "instagram",
      "lastNotifiedAt",
      "notes"
    ]);
  }

  return sh;
}

function indexMap_(headerRow) {
  const m = {};
  for (let i = 0; i < headerRow.length; i++) {
    const k = String(headerRow[i] || "").trim();
    if (k) m[k] = i;
  }
  return {
    createdAt: m.createdAt ?? 0,
    status: m.status ?? 1,
    date: m.date ?? 2,
    hours: m.hours ?? 3,
    email: m.email ?? 4,
    phone: m.phone ?? 5,
    instagram: m.instagram ?? 6,
    lastNotifiedAt: m.lastNotifiedAt ?? 7,
    notes: m.notes ?? 8
  };
}

function parseLocalDateTimeHourOnly_(dateStr, timeStr) {
  const m = String(timeStr).trim().match(/^(\d{1,2}):00\s*(AM|PM)$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  const ap = m[2].toUpperCase();

  if (hh < 1 || hh > 12) return null;
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;

  const iso = dateStr + "T" + String(hh).padStart(2, "0") + ":00:00";
  return new Date(iso);
}

function formatTimeLabelHourOnly_(d) {
  const hh24 = d.getHours();
  return timeLabel_(hh24);
}

function timeLabel_(hh24) {
  const ap = hh24 >= 12 ? "PM" : "AM";
  const hh12 = ((hh24 + 11) % 12) + 1;
  return hh12 + ":00 " + ap;
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
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN)
    .setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}


