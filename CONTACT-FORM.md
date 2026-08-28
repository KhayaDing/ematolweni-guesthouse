# Netlify Forms and Afrihost deployment

## Implemented flow

The homepage embeds https://ematolweni-guesthouse.netlify.app/enquiry.html.
That document is served by Netlify and sends a URL-encoded POST to its own origin.
Afrihost serves the surrounding static website; it does not relay enquiry fields.
The same homepage works on Netlify. No PHP relay, private API token or cross-origin
AJAX is used. A visible link opens the receiver in a new tab if embedding fails.

The receiver preserves the existing fields, consent, honeypot, validation, loading
state, duplicate-submit lock, 15-second timeout and error messages. Native no-JS
submission targets the fixed Netlify URL. JavaScript refuses to submit a downloaded
receiver copy from another origin. HTTP acceptance does not promise inbox delivery
or a booking. Required fields and length limits are browser validation, not a
server-side security boundary; Netlify handles ingestion and spam filtering.

Only height messages cross from the iframe to its parent. The parent checks both
the exact receiver origin and sending window, validates the height and bounds it.
The receiver sends only to the known HTTPS guesthouse/Netlify parent origins.
Netlify's enquiry.html CSP permits framing only by those guesthouse domains and
itself. Do not add X-Frame-Options: DENY/SAMEORIGIN to this receiver: that would
block the intended Afrihost embed. Other pages need no framing permission.

## Netlify configuration

- Repository: https://github.com/KhayaDing/ematolweni-guesthouse, branch main.
- Node 24; pnpm version pinned in package.json.
- Build: pnpm build && pnpm check. Publish: dist.
- Receiver: /enquiry.html. Detected form: contact.
- Fields: firstName, surname, email, phone, checkIn, checkOut, message,
  privacyConsent, bot-field, and hidden form-name=contact.
- Owner screenshots confirm form detection enabled and an email notification rule
  for the owner's designated Gmail inbox. Keep that recipient in the dashboard,
  not source code. Preserve the email field name for notification Reply-To.
- After each form-field change, redeploy and confirm the detected fields and the
  honeypot. Review Netlify Verified and Spam submissions and account usage limits.

## Afrihost upload

1. Run pnpm validate. Upload only the generated contents of dist, never this repo.
2. Back up the existing domain document root and its server configuration first.
3. Extract/upload the release so index.html sits directly in the domain document
   root (usually public_html). Do not add an extra dist directory level.
4. Preserve .htaccess, .well-known/ACME, mail settings and legitimate host files.
   Do not overwrite unrelated sites or delete old assets before cached HTML expires.
5. Keep website DNS and email routing unchanged. Confirm HTTPS for the root and www.
6. If the existing site has a Content-Security-Policy, allow the Netlify receiver
   in frame-src. Do not discard existing security rules to make the embed work.
7. Open the live contact section and verify the iframe, fallback link, mobile layout
   and privacy links. Existing Netlify dashboards are not evidence of Afrihost upload.

## Delivery verification

After the receiver is published, send one approved, clearly labelled test enquiry.
Record the label and timestamp privately, never in Git. Confirm its record in Netlify
and separately its email in the designated inbox (including spam). A 200 response or
success message alone does not establish recording or delivery. Do not resend on an
uncertain result without checking for duplicates. Test-data deletion needs agreement.

## Outstanding operational confirmations

The owner must confirm retention/deletion schedules and authorised staff access,
forwarding, exports and backups. The Privacy Policy describes the implemented data
flow but remains an operational draft needing owner/legal review.

Afrihost upload, live submission recording and inbox delivery require independent
verification; they must not be inferred from a successful build or GitHub push.

References:
- https://docs.netlify.com/manage/forms/setup/
- https://docs.netlify.com/manage/forms/notifications/
- https://docs.netlify.com/manage/forms/spam-filters/
- https://docs.netlify.com/manage/routing/headers/
