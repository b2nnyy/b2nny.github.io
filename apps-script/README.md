## b2nny EP vote backend (Google Apps Script)

`apps-script/Code.gs` is the backend for the `/vote/` page. It is JSONP-friendly for static GitHub Pages hosting.

### Modes

- `mode=results` returns ranked vote totals.
- `mode=vote&choices=track-01,track-02,track-03,track-04,track-05&fingerprintHash=...` records one ballot.

Voting opens **May 18, 2026 12:00 AM ET** and closes **May 21, 2026 12:00 AM ET**. Votes are stored in a Google Sheet that is auto-created unless `VOTE_SHEET_ID` is set in `Code.gs`.

### Setup

1. Open your Apps Script project.
2. Replace the project `Code.gs` with `apps-script/Code.gs`.
3. Deploy as a Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Copy the `/exec` Web App URL.
5. Paste it into `vote/index.html`:

```html
<meta name="b2nny-vote-endpoint" content="https://script.google.com/macros/s/.../exec" />
```

6. Test the deployment:

```text
https://script.google.com/macros/s/.../exec?mode=results
```

Expected response starts with:

```json
{"ok":true
```

### Updating Tracks

Track IDs must match in both places:

- `vote/vote.js`
- `apps-script/Code.gs`

When replacing placeholders, update both the display titles and the audio filenames in the frontend manifest. Keep the IDs stable (`track-01` through `track-10`) unless you also update all stored votes or start a fresh vote sheet.
