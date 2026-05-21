## 2synth paid sales backend (Google Apps Script + Stripe)

This backend lets you sell `2synth` for `$15` directly on `b2nny.com` while keeping installers private and requiring license activation.

### What this does

- Verifies Stripe Checkout `sessionId` server-side before issuing a license key.
- Prevents duplicate claims for the same paid checkout session.
- Supports activation with a device limit (`MAX_DEVICES`, default `2`).
- Supports runtime validation from plugin/client code.

### API modes

- `mode=claim&sessionId=...&email=...`
- `mode=activate&licenseKey=...&machineHash=...&pluginVersion=...`
- `mode=validate&licenseKey=...&machineHash=...`

### Setup

1. In Apps Script, create/open a project and paste `Code.gs`.
2. Set Script Property `STRIPE_SECRET_KEY` to your Stripe secret key.
3. Run `setup2SynthSalesBackend()` once.
4. Deploy as Web App:
- Execute as: `Me`
- Who has access: `Anyone`
5. Copy the `/exec` URL.

### Website wiring (`index.html`)

Set these meta tags:

```html
<meta name="b2nny-2synth-checkout-url" content="https://buy.stripe.com/your-payment-link" />
<meta name="b2nny-2synth-license-url" content="https://your-license-portal.example.com" />
```

### Recommended secure delivery flow

1. Customer clicks `Buy 2synth ($15)` on your site.
2. Stripe success page redirects to your license page with `{CHECKOUT_SESSION_ID}`.
3. License page calls Apps Script `mode=claim` with `sessionId` + email.
4. Backend returns `licenseKey` only if Stripe confirms payment is complete and amount is exactly `$15`.
5. Customer downloads installer from a private location after claim.
6. Plugin/app calls `activate` on first run and `validate` periodically.

### Strong protection recommendations

- Do not host paid installer binaries in public `/downloads`.
- Put paid installers in private storage with short-lived signed URLs.
- In plugin code, gate full functionality behind successful activation.
- Cache recent valid activation locally so users can work offline for a grace period.
- Add kill switch by setting `status` to `revoked`/`paused` in the sheet.

### Important

No copy-protection is unbreakable. Goal is to make abuse expensive while keeping legit customers friction-low.
