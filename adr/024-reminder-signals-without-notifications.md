# ADR-024: Reminder signals without notifications

**Date:** 2026-10-11
**Decision:** Due reminders are checked every minute. They show in a band on the day note, as a counter in the tab title, as a dot on the favicon (an inline SVG `data:` URL, allowed by `img-src`), and as the installed app's badge (`navigator.setAppBadge`, local only). The checkout lists reminders due by the end of the day being checked out.
**Why:** spec/abertura-do-dia.md ("Lembretes") asks for passive signals only; all of these stay on the machine.
