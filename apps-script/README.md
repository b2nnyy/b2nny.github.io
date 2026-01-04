## b2nny booking backend upgrades (Google Apps Script)

Your site calls your Apps Script endpoint with JSONP:

- `mode=busy&date=YYYY-MM-DD` → returns busy time blocks for that date
- `mode=book&...` → creates a booking request (and writes details into the Calendar event description)

This site update adds **optional** frontend calls for:

- `mode=waitlist&date=YYYY-MM-DD&hours=2&email=...&phone=...&instagram=...`

`apps-script/Code.gs` includes these additions.

### Important limitations (honest)

- **Deposit checkout “locking”** cannot be fully automated from a static site without verifying Stripe/PayPal payments on a server (webhook or API verification).
  - The site supports **deposit links** (Stripe Payment Link / PayPal.me) and can **record deposit intent** in the booking request.
  - True “lock the time instantly after payment” requires backend + payment verification.

- **Auto-notify waitlist** requires backend storage + a trigger to re-check availability and send messages when slots open.

This repo includes a working baseline:
- `mode=waitlist` stores entries in a Google Sheet (auto-created if you don’t set an ID).
- `notifyWaitlist()` sends **email notifications** when a requested-length window exists.

### Setup steps

1. Open your Apps Script project
2. Replace your existing code with `apps-script/Code.gs` (or merge it)
3. Deploy as Web App (execute as you; allow anyone)
4. Hit your endpoint once with `mode=waitlist` to auto-create the waitlist spreadsheet (or set `WAITLIST_SHEET_ID`)
5. Add a trigger:
   - Triggers → Add Trigger
   - Choose function: `notifyWaitlist`
   - Event source: Time-driven
   - Every 10/30 minutes

### Notes

- Auto-notify is **email-only** (unless you build SMS/DM integrations). Users can still join with phone/IG, but email is required for automatic notifications.
- You can edit:
  - `NOTIFY_LOOKAHEAD_DAYS`
  - `NOTIFY_COOLDOWN_HOURS`
  - `BOOKING_LINK`

1. Add a **Waitlist** sheet + endpoint support:
   - Store waitlist entries into a Google Sheet.
   - Optionally email the user a confirmation immediately.

2. Add a timed trigger (every 10–30 min) that:
   - Looks at waitlist entries for the next N days.
   - Checks availability for those days.
   - Emails/texts users when enough time becomes available.

### Next step

If you want me to generate the full Apps Script code tailored to your current `busy` + `book` logic, paste your existing Apps Script source (the Code.gs contents) here and I’ll:

- Add `mode=waitlist`
- Add a `notifyWaitlist()` function + instructions to create a trigger
- Keep output JSONP-compatible (your frontend uses `callback=...`)


