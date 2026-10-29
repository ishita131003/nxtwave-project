# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the challenge reviewer.** An evaluator of the simulated NxtWave Growth Intern challenge who clones the repo, runs it locally, and needs to sign in and understand the measurement story in under two minutes. Their judgement decides whether the prototype succeeded.
- **Simulated persona: final-year engineering students in India.** Arrive from shared links, mostly on phones and often inside WhatsApp's in-app browser (~360px wide); register, get a referral code, share it.
- **Simulated persona: the growth admin.** Reads KPIs and attribution, manages ambassador/club codes and suggestions, and makes the day-3 "where do we double down" call.

## Product Purpose

NxtWave Growth Hub is a local-only demo of the growth stack for one campaign: "Build Your First AI Project in 60 Minutes", a free, online, beginner-friendly workshop. Goal: 500 unique valid registrations in 7 days on a ₹2,000 budget, driven mainly by college ambassadors/clubs, WhatsApp communities and peer referrals, with limited social. Success for the prototype is that a reviewer can see honest, traceable measurement: every number derives from stored rows, and the app is upfront about what it can't verify.

## Positioning

A measurement-first prototype. It separates self-reported and observed attribution, labels link opens "unverified", flags suspected duplicates instead of hiding them, and backs every KPI with a hand-computed golden fixture. It never inflates or invents data.

## Operating Context

- Runs entirely in the browser (localStorage). No backend, cloud services or real email. Data is per-browser.
- Reviewers use the seeded demo credentials (student and admin) and the "Reset Demo Data" control.
- Two separate portals with their own layouts: student (Dashboard, Campaign Details, Referral, Community, Suggestions, Profile) and admin (Dashboard, Registrations, Referrals, Analytics, Suggestions, Campaign Settings, Profile).
- Measurement contract: `docs/measurement.md`.

## Capabilities and Constraints

- Stack already set: React + Vite + TypeScript, Tailwind, React Router, Recharts, Lucide, Zod.
- Always show "Prototype · not affiliated" branding and a persistent "DEMO DATA — NOT REAL REGISTRATIONS" banner.
- Never invent a workshop date, speaker, meeting link, certificate, placement claim or scarcity. Where people expect these, say "to be announced to registered participants".
- The WhatsApp community link comes only from configuration; when it's unset the UI says "Community link coming soon".
- Browser storage can be read and edited in devtools. The local auth is a demo, not real security, and the UI and docs say so plainly.

## Brand Commitments

- Name: "NxtWave Growth Hub", always paired with "Prototype · not affiliated".
- Identity: loosely echoes NxtWave's look and feel (user decision) without using NxtWave's logo or official marks, or presenting itself as an official NxtWave system.
- Voice: plain, honest and specific. State limitations directly; no hype or growth-hacking language.

## Evidence on Hand

- All registrations, names, colleges, codes and suggestions are fictional seed data (`src/api/seed.ts`), each record marked fictional.
- No real testimonials, speakers, partner colleges, photos, workshop schedule or results exist. Future work must not fabricate any of them.

## Product Principles

1. Honest numbers over impressive numbers: show the formula, the sample size and the caveat.
2. Two minutes to understanding: the reviewer should reach a meaningful screen with demo credentials immediately.
3. Phone-first for students, scan-first for admins.
4. Say what's simulated: demo limits are disclosed where they matter, not buried.

## Accessibility & Inclusion

- WCAG 2.1 AA: contrast, keyboard access, visible focus, touch targets ≥ 44px; zero serious/critical axe violations on key pages.
- English-only copy.
- Must work at 360px in the WhatsApp in-app browser on modest connections.
