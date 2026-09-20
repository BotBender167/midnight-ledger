# ADR 0001 — Present the three archives as unresolved rather than merging them

- **Status:** Accepted
- **Date:** 2026-09-20

## Context

The brief, *"Your Life, In Receipts"*, asks for a story built from one person's digital
residue, and supplies three datasets. Read carefully, they do not describe the same person:

- **Archive A** — 149,860 Spotify plays, 2013–2024. The Beatles, The Killers, Bob Dylan,
  John Mayer. Timestamps are UTC. No location recorded anywhere.
- **Archive B** — 2,461 household transactions, 2015–2018. Rupees, idli, Ganesh Chaturthi,
  train fares between places already anonymised to "Place 0"…"Place 5".
- **Archive C** — 10,267 card transactions, 2022–2024, carrying 10,000 distinct cardholder
  names. A fraud-detection sample.

The obvious move is to merge all three and narrate one life. It reads well and it is false.

## Decision

Present the archives as three separate, named sources and make the reader the judge.

1. Archive C is **never** shown as the subject. It appears once, as "the crowd" — the ambient
   economy running while the subject listened alone — and its own card marks it untrusted.
2. Archives A and B are shown side by side, with the evidence for a single person (both peak in
   2017, independently) and the objection stated in the same breath (a four-year overlap makes
   one shared peak unremarkable).
3. The closing section refuses to resolve it: *"The honest answer is that the data does not say."*

## Consequences

**Good.** The premise becomes the interactive hook rather than a flaw to hide. The connection
engine's cross-archive bonus has a real job — those links are the actual evidence under debate.
The timezone dial follows from the same honesty: the archive is UTC, so the reader picks the
assumption instead of us inventing one.

**Bad.** The site cannot deliver the warm single-protagonist story the brief gestures at. There
is no named character. Some readers will want a conclusion and not get one.

**Accepted cost.** A fabricated protagonist would have required inventing links between datasets
that do not connect, which is the failure mode the brief's own "what does it all mean?" question
is trying to avoid.
