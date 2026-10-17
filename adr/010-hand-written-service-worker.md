# ADR-010: Hand-written service worker

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** `public/sw.js` caches same-origin GET requests: network first for pages (new versions show up when online), cache first for hashed assets. Registered only in production builds.
**Why:** Offline support with no extra dependency. It never handles user data.
