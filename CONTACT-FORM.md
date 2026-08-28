# Contact form: local safeguards and release gates

Review date: 27 August 2026. **Integration incomplete; do not release as a working form.**
Netlify Forms remains the intended backend, Afrihost the website host and GitHub the
source platform. No deployment, dashboard change or real test enquiry was performed.
The initial review preceded Git setup. The owner subsequently selected the existing repository at https://github.com/KhayaDing/ematolweni-guesthouse and authorized a source push for Netlify. Git setup preserves the existing main history; a push does not complete the integration or verify a deployment.

## Findings and architecture decision required

The original static form used `action="/"`, `data-netlify="true"`, a hidden
`form-name=contact` and URL-encoded fetch. On Afrihost, `/` addresses Afrihost.
The previous handler treated any HTTP success (even the static preview's home page)
as a successful enquiry. The Netlify config builds `dist`; it does not configure Afrihost.
Existing browser tests checked validity but deliberately never exercised submissions.
The privacy draft described notifications, staff access and deletion as established facts.

Netlify's [official setup documentation](https://docs.netlify.com/manage/forms/setup/)
requires form detection and deployed HTML on a Netlify project. Its AJAX examples POST
URL-encoded fields to the Netlify site's own paths. All field names must match the
deployed definition. Code on GitHub alone is not a deployment or a Forms registration.

A direct cross-origin AJAX Forms endpoint for an externally hosted site is **not
established by the documentation reviewed**. Do not assume support or attempt to fix
this with `mode: no-cors`: opaque responses cannot confirm acceptance. Native cross-origin
form navigation and AJAX response access are different; a browser allowing a POST does
not establish a supported integration or a recorded submission. Netlify's documented
custom success-page action is relative to the Netlify site. CORS headers must come from
the responding service; client-side headers do not grant access.

Two choices require owner approval before implementation:

1. **Explore an Afrihost server-side relay plus a small Netlify receiver deployment.**
   This preserves the current page design. Confirm forwarding support with Netlify and
   server/runtime/outbound HTTPS support with Afrihost first. This is a proposed custom
   integration, not a verified Netlify recipe. A relay must validate required fields,
   consent, lengths and dates server-side, restrict the upstream URL, enforce timeouts,
   prevent abuse, preserve the honeypot and avoid logging personal information. It must
   distinguish a Forms acceptance from redirects, static HTML and generic HTTP success.
   Browser-only validation is not a security boundary. No relay or API-token access has
   been added. If strict recorded-submission confirmation requires a server API lookup,
   that extra scope/access must also be approved; never put its token in browser code.
2. **Host the actual form on Netlify** and link to it from Afrihost, or discuss embedding
   it with the owner. The actual form then uses Netlify's documented same-origin flow.
   A link/iframe changes the user journey; embedding also needs approved framing rules,
   responsive sizing, accessibility and careful origin-checked messaging if used.

No choice is silently selected. Do not enable the current flag to simulate completion.
Once a route is approved, implement and test its real response contract, revise the
privacy text to match that data flow, and replace this decision section with exact
endpoint/receiver deployment details. Those details cannot safely be supplied yet.

## Safe local changes

- Source and built form have `data-submission-enabled="false"` and a disabled submit
  button. The JS handler also refuses dispatched submits. Ordinary no-JS submission is
  blocked. The existing inert `/` action is retained, not represented as a working route.
- Fields, consent, design, dates, booking and WhatsApp destinations are preserved.
- Added a hidden `bot-field` and `netlify-honeypot="bot-field"`. Client code rejects a
  filled trap without showing success. Server spam protection still needs deployment.
- Pending state has an in-flight lock, disabled button and `aria-busy`; required text
  is trimmed. Requests time out after 15 seconds and are never automatically retried.
  Failure retains data and warns that acceptance is uncertain. A timeout can occur
  after a server accepts a POST, so contact staff before retrying to avoid duplicates.
- The gated existing transport uses same-origin mode, no credentials and rejects
  redirects, non-success and opaque responses. Its success UI is provisional until
  the real route is approved; it explicitly does not promise email delivery or booking.
- Preview rejects POST with HTTP 405. Privacy sections now distinguish planned hosting,
  Netlify processing, mailbox copies and source storage, and flag unknown business facts.
- In-memory browser transport tests exercise states; they do not prove Netlify acceptance.

## Required Netlify setup (after explicit approval)

1. Owner signs in through Netlify's normal browser login and grants only necessary
   project access. Confirm project ownership and the receiver hostname. Never paste
   passwords, tokens or credentials into chat, source, screenshots or deployment files.
2. Approve the receiver architecture and release artifact first. For a whole-site
   Netlify deployment, current config is Node 24, pinned pnpm 11.19.0, command
   `pnpm build && pnpm check`, publish `dist`. A small receiver needs its own approved
   build/output configuration; it is not present yet. Do not publish the project root.
3. In the Netlify project, go to **Forms > Enable form detection**. If previously
   disabled, use **Forms > Usage and configuration > Form detection**. Deploy/redeploy
   after enabling, then verify a detected `contact` form in the dashboard.
4. Confirm the deployed definition includes `firstName`, `surname`, `email`, `phone`,
   `checkIn`, `checkOut`, `message`, `privacyConsent`, `bot-field`, and the correct
   `form-name=contact` submission value. Keep receiver and public fields in sync.
5. Verify **Extra spam prevention** reports the honeypot. Netlify also applies Akismet;
   inspect Verified and Spam lists. Honeypot-rejected submissions may not appear in either.
   No reCAPTCHA was added. If requested later, evaluate its extra privacy/accessibility
   requirements and use Netlify's supported reCAPTCHA 2 setup, with secrets only in
   protected server configuration. [Spam filter documentation](https://docs.netlify.com/manage/forms/spam-filters/).
6. The owner has confirmed a separate notification inbox. Configure it in Netlify after approval; do not publish it in source or replace the public contact address. Delivery is still unverified.
7. With approval, go to **Project configuration > Notifications > Emails and webhooks
   > Form submission notifications**, add an email notification for `contact` to the
   confirmed inbox, and avoid duplicate rules. Suggested dashboard subject:
   `EMatolweni enquiry - %{formName} - %{submissionId}`. Preserve field `name="email"`
   for Reply-To. Notifications apply to verified submissions; the documented sender is
   `formresponses@netlify.com`. Check mailbox spam/quarantine rules without disabling
   protection. [Notification documentation](https://docs.netlify.com/manage/forms/notifications/).

## Afrihost and GitHub release steps (after approval and integration completion)

1. Confirm the GitHub repository URL, permitted maintainers and visibility. Review
   tracked files and `.gitignore` before any approved commit/push; no submissions,
   secrets, `.netlify`, backups, reports or `node_modules` belong in GitHub. Disable
   automatic deployment until explicitly approved; connecting GitHub to Netlify can
   itself trigger a deployment. GitHub stores source, not enquiries.
2. Run `pnpm install --frozen-lockfile`, install the test browser if necessary, and run
   **`pnpm validate`**. Inspect the resulting release and privacy wording.
3. Confirm the actual Afrihost hosting package and domain document root. On cPanel/CWP,
   use ClientZone > Hosting > selected domain > Website Manager > Log into Website
   Manager > File Manager. The usual Linux root is `public_html`; addon domains may
   differ. Use the secure control panel or a host-approved encrypted transfer method.
4. Back up the current approved release and agree rollback. Upload **only the contents
   of `dist/`**, never this repository or `dist` as an extra nesting directory. Preserve
   server-managed ACME files and existing legitimate host rules. Proposed files in
   `deployment/` are not approved upload artifacts. A future relay requires an explicit
   reviewed build allowlist addition; never bypass that rule by uploading source PHP.
5. Keep website DNS at Afrihost. Do not redirect the Netlify receiver back to Afrihost.
   Confirm HTTPS, MIME types, HTML revalidation, fingerprinted asset caching and any
   host-approved proxy/security rules. Preserve prior hashed assets until cached HTML
   expires, or use an atomic release switch. Verify mobile and desktop output.
6. Do not enable a working-form claim or publish final privacy wording until the actual
   data flow is configured and the owner has approved it. Current `dist` is a safe
   disabled-form build, not a completed integration release.

Afrihost reference: [uploading website files](https://help.afrihost.com/entry/how-to-publish-or-upload-your-website-files-to-the-internet-and-make-your-website-live/).

## Owner confirmations still needed

- Approval to explore the relay, or selection of a Netlify-hosted form page.
- Verify the supplied Netlify project and its public hostname, plus Afrihost runtime/package.
- Approved staff/developer access and forwarding for the confirmed notification inbox.
- Retention periods, deletion owner/review interval, exports, trash and backups for
  Netlify, email and server logs; treatment of enquiries that become bookings.
- Confirmation of other existing business assertions in the privacy draft (for example
  bank-detail handling, marketing practices and Information Officer details). They were
  not independently verified. No legal-compliance claim is made by this review.
- Separate approval for deployment, live settings changes and **one** real test enquiry.

## Live verification protocol: not performed

After all preceding approvals, agree a unique label such as `EMATOLWENI FORM TEST
<date/time> - NOT A BOOKING`. Submit exactly once using owner-approved non-sensitive
names/phone/dates and a controlled test email address. Include a complete sentence
explaining it is an authorized delivery test. Fake addresses or repeated submissions
can be classified as spam; do not send extra tests without fresh approval.

Record the timestamp and label privately. Verify the matching record in Netlify
Forms (and inspect Spam if absent), matching fields and consent. Then separately
verify the corresponding email in the confirmed inbox, including spam/quarantine.
If inbox access is unavailable, ask the owner to confirm receipt of that exact label.
A success message, HTTP 2xx, queued notification or dashboard record alone is not
proof of inbox delivery. If evidence is missing, report it as unverified. Agree deletion
of test copies separately; do not delete real enquiries or change filters casually.

Ongoing dependencies: Afrihost service/HTTPS, a live Netlify receiver with detection
and notifications enabled, synchronized form definitions, mailbox availability and
spam review, account access/retention management, and maintenance of any approved
relay. Review the account's [Forms usage and billing](https://docs.netlify.com/manage/forms/usage-and-billing/)
for its actual plan rather than assuming limits or prices.

## Local verification record

Final validation completed successfully: `pnpm validate` passed HTML, 883 local reference
checks, JavaScript syntax, loading unit tests, the 588-file output allowlist and reproducible
build checks, 605 image variants, and all 63 browser tests across desktop, tablet and
mobile. Contact tests covered invalid/required inputs, consent, loading, duplicate
prevention, mocked acceptance, HTTP/network/opaque/redirect errors, timeout, honeypot
and the disabled form with/without JavaScript. Automated enquiry transport was mocked;
no real enquiry was sent. The separate interactive browser/image inspection was blocked
by a Windows sandbox startup error; automated screenshots are in `test-results/`.
Production submission and inbox delivery remain **UNVERIFIED**.
