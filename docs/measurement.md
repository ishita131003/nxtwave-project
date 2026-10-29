# Measurement model — "Build Your First AI Project in 60 Minutes"

> Prototype · not affiliated with NxtWave. Every number in the app is **demo data**.

This document is written before the code and is the contract the metrics module
(`src/lib/metrics.ts`) and the golden fixture (`tests/fixtures/expected.json`) implement.

## 1. Campaign constraints

| Item | Value |
| --- | --- |
| Offer | Free, online, beginner-friendly workshop |
| Goal | 500 unique **valid** registrations |
| Window | 7 days |
| Budget | ₹2,000 total |
| Audience | Final-year engineering students in India |
| Strategy | College ambassadors/clubs, WhatsApp communities, peer referrals, limited social |

Things the app must never invent: a workshop date, speaker, meeting link, certificate,
placement claim, or scarcity ("only N seats left"). Where users would expect one, the UI says
"to be announced to registered participants".

## 2. Funnel math

- Required pace: 500 ÷ 7 ≈ **72 registrations/day** on average.
- Cost ceiling: ₹2,000 ÷ 500 = **₹4 per registration** blended.
- Paid social at Indian student CPMs realistically lands far above ₹4/registration, so paid is a
  **creative-learning** spend, not a volume channel. Organic channels must carry **~90%** (≈450).

### Planned budget (tracked separately from actual spend)

| Line | Planned ₹ | Purpose |
| --- | ---: | --- |
| Paid test | 800 | Days 1–2: small spend split across 3–4 creatives to learn which message works |
| Creatives | 400 | Campaign card / short-video production or boosting assets |
| Winner | 600 | Days 3–6: put money behind the best-performing creative |
| Contingency | 200 | Unplanned needs; unspent by default |
| **Total** | **2,000** | |

Planned rows never count as spend. **Actual** spend is a separate list of dated rows entered by an
admin. Cost per registration (CPR) = actual spend ÷ valid registrations, shown **only when actual
spend > 0** (otherwise "—").

### Required contribution per channel

| Channel | Share | Valid regs (7 d) | Per day | Leading indicator to watch |
| --- | ---: | ---: | ---: | --- |
| College ambassadors & clubs | 40% | 200 | ≈ 29 | Active ambassador/club codes × regs per code (e.g. 15 codes × ~13) |
| WhatsApp communities | 25% | 125 | ≈ 18 | Regs with `utm_source=whatsapp` and no valid code |
| Peer referrals (student codes) | 20% | 100 | ≈ 14 | Students with ≥ 1 valid referral; regs per referring student |
| Organic social (LinkedIn/Instagram/Facebook, unpaid) | 5% | 25 | ≈ 4 | Regs with social `utm_source` |
| Paid social | ≤ 10% | ≤ 50 | ≈ 10/day from day 3 | Actual spend, CPR, creative CTR (outside this app) |
| **Total** | 100% | **500** | **≈ 72** | |

Default daily target curve (editable in Campaign Settings; must sum to the target):
`[40, 55, 65, 75, 85, 90, 90]` = 500. It ramps because ambassadors and referrals compound.

## 3. What counts as a valid registration

A **valid registration** is a registration row that:

1. belongs to a unique student account — uniqueness is by **normalized email** = `trim()` +
   `toLowerCase()`. A second registration with the same normalized email is rejected;
2. has `consent = true` (the form cannot submit without it);
3. has not been marked `rejected` by an admin (status changes are written to the audit log).

**Suspected duplicates are flagged, never rejected or silently dropped.** A registration is a
suspected duplicate when either:

- its **alias key** collides with an *earlier* registration — for `gmail.com`/`googlemail.com`
  the alias key removes dots and any `+tag` from the local part and maps to `gmail.com`
  (`r.iya+ai@gmail.com` → `riya@gmail.com`); or
- its domain is on the disposable-email list (`mailinator.com`, `yopmail.com`, …).

Suspected duplicates still count as valid until an admin reviews them; the dashboard shows the
suspected count next to the valid count so the reviewer can judge.

## 4. Attribution — two fields, never merged

| Field | Where it comes from | Trust |
| --- | --- | --- |
| `self_reported_source` | Required dropdown on the form: ambassador/club, WhatsApp, friend, Instagram, LinkedIn, Facebook, other | What the student remembers |
| `observed` | `utm_source`, `utm_medium`, `utm_campaign` and `?ref=` captured from the **landing URL** into `sessionStorage`, so they survive navigation to `/register` | What the link says |

The raw observed values are stored on the registration. The **observed channel** is derived:

1. a **valid** referral code wins: `student` code → `friend`; `ambassador`/`club` code →
   `ambassador_club`;
2. else `utm_source` is mapped (`whatsapp`, `instagram`, `linkedin`, `facebook`; `ambassador` or
   `club` → `ambassador_club`; `referral` → `friend`; anything else → `other`);
3. else `direct` (no tracking information).

Dashboards show both distributions side by side plus a **disagreement** count: registrations whose
observed channel is known (not `direct`) and differs from the self-reported source. Both bar sets
sum to the number of valid registrations.

## 5. Referral codes

| `owner_type` | Created by | Notes |
| --- | --- | --- |
| `student` | Automatically, once, at registration | Stable for the life of the account |
| `ambassador` | Admin | Owner label + optional owner email |
| `club` | Admin | Owner label + optional owner email |

Resolution happens inside the registration write (one synchronous read-check-write):

- code not found → `invalid_ref` (registration still succeeds; nobody gets credit; the form warns
  beforehand);
- registrant's normalized email **or alias key** equals the code owner's → `rejected_self`;
- otherwise → `valid`.

Only `valid` referrals count toward "referred" and toward a code's registrations.

## 6. Event log (source of truth for the funnel)

Append-only rows, no PII, keyed by a random **anonymous session id** stored in `sessionStorage`:

| Event | Fired when |
| --- | --- |
| `landing_view` | Landing page loads |
| `ref_link_open` | Landing page loads with `?ref=` (one per code per session in metrics) |
| `register_view` | Register page loads |
| `register_success` | Registration write succeeds |

Each row carries `{id, type, session_id, ts, ref?, utm_source?, utm_medium?, utm_campaign?}` —
no name, email or user id. A privacy note on the landing page says this.

**Link opens are labelled "unverified"**: anyone can open a link repeatedly, from any device, and
we cannot prove a human opened it. Metrics count *distinct sessions*, which dampens refresh
inflation but does not prevent it.

**Every metric is derived from stored rows at read time.** There are no stored counters.
Funnel steps count distinct sessions with that event; registration KPIs count registration rows.
Because they are different row sets, `register_success` (events) can legitimately differ from
valid registrations (e.g. an admin later rejects one).

Code conversion = valid registrations with that code ÷ distinct-session link opens for that code.
Shown with its formula; "—" when opens = 0. Samples under 10 opens are marked "low sample".

## 7. KPIs

| KPI | Definition |
| --- | --- |
| Valid registrations | §3 |
| Target / remaining / % | settings target; `max(target − valid, 0)`; `valid ÷ target` |
| Today | Valid registrations whose IST date is today |
| Referred | Valid registrations with `ref_status = valid` |
| Active channels | Distinct observed channels (excluding `direct`) with ≥ 1 valid registration in range |
| Suspected duplicates | Valid registrations flagged by §3 |
| Daily line | Valid registrations per IST campaign day vs the daily target curve |

All day bucketing uses **IST (UTC+05:30)** so results do not depend on the viewer's time zone.

## 8. Day-3 decision view

At the end of campaign day 3 an admin must decide where to double down. The view uses only
days 1–3 (or up to today if earlier) and shows:

- valid registrations per observed channel, share of total, and the channel's required daily pace
  from the table above;
- valid registrations, unverified opens and conversion per code;
- current pace vs required pace: `(target − valid) ÷ days remaining`.

Recommendation rule (deterministic, shown in the UI):

- **Channel**: the observed channel (excluding `direct`) with the most valid registrations in
  days 1–3; ties broken alphabetically.
- **Code**: most valid registrations in days 1–3; ties broken by higher conversion, then code
  name. Codes with < 10 opens are flagged "low sample" so nobody over-reads a 2-of-4.

## 9. Known measurement limitations

- Data lives in one browser; there is no cross-device registration or aggregation.
- UTM parameters are lost if the student opens the landing page without them (e.g. retypes the URL).
- WhatsApp's in-app browser may open a new session for every tap, inflating opens.
- `register_success` events and registration rows are written together, but nothing stops a
  devtools user from editing either.
