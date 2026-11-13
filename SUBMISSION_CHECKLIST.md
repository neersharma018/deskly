# DESKLY submission checklist

- [x] Audited the storefront routes, FastAPI endpoints, PostgreSQL model, configuration and existing tests.
- [x] Fixed false startup success on occupied web ports, route metadata, missing favicon and outdated navigation assertions.
- [x] Added database-backed demo checkout and explicit unpaid confirmation.
- [x] Verified protected API responses, database migrations, and payment and recommendation behavior against disposable PostgreSQL.
- [x] Verify catalogue, cart, checkout, authentication, admin and recommendations using the production build and PostgreSQL.
- [x] Check public layout at 320, 390, 768 and 1440 px, and account/admin layouts at 320 and 1440 px.
- [x] Complete the evaluator documents and record actual outcomes in the [final report](FINAL_SUBMISSION_REPORT.md).

| Items from the screenshot | Result |
| --- | --- |
| 1, 16, 20 · Horizontal scrolling, overflow and mobile layout | Checked 14 public routes at four widths and 15 authenticated views at two widths. Data tables retain their own scroll region. |
| 2, 7, 15 · Broken links, footer links and unused navigation | Checked 27 distinct homepage destinations, including story and category anchors. The footer links to real routes. |
| 3, 17 · Mobile menu and logo | Verified the mobile menu opens the story section and the logo returns home. |
| 4, 5, 6, 8, 9 · Icon, titles, descriptions, 404 and year | Added a DESKLY icon, page metadata and a recovery screen for invalid URLs. The server renders the current copyright year. |
| 10 · Image size | Main photos are WebP, with responsive sizing. Recompressed the Setup Builder campaign photo from 277 KB to 92 KB. |
| 11–14 · Actions, feedback and placeholder copy | Corrected sign-in and checkout navigation. Added or verified bag and order feedback and replaced the configuration wording on checkout with a customer-facing message. Labels and genuine input hints remain. |
| 18–19 · Clickable phone and email | `tel:` and `mailto:` links passed with test values. The public footer needs real store contact details before it can display them. |
