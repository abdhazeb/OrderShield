# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Suplyrate** — a trade protection / supplier verification platform. The product was renamed from "OrderShieldPro", which survives only as legacy identifiers: namespaces, project names, the `OrderShieldProDb` database, and IIS site names. Use "Suplyrate" in all new user-facing copy (UI strings, emails, docs); don't mass-rename the code identifiers unless that refactor is explicitly requested. Brokers and importers search a directory of trade entities (suppliers/brokers) and read or submit incident reviews; an internal service team moderates submissions before publication. `OrderShieldPro-BRD.md` holds the full requirements; `prototype.html` and `mobile-app-prototype.html` are static design prototypes, not part of the build.

Two independent apps in one repo:
- `src/` — .NET 8 Web API, Clean Architecture + CQRS (solution: `src/OrderShieldPro.sln`)
- `ordershieldpro-web/` — Angular 19 standalone-component SPA

## Commands

Backend (from `src/`):
```powershell
dotnet build
dotnet test                                            # xUnit + FluentAssertions + Moq
dotnet test --filter FullyQualifiedName~CreateReviewCommandHandlerTests   # single test class
dotnet test --filter "FullyQualifiedName~SearchEntitiesQueryHandlerTests.Handle_Returns_Published"  # single test
```

Run the API (from `src/OrderShieldPro.API/`):
```powershell
dotnet run --launch-profile https      # https://localhost:7055 + http://localhost:5017, Swagger at /swagger
dotnet run --launch-profile network    # 0.0.0.0:5017, for testing from a phone on the LAN
```

EF Core migrations (run from `src/`, startup project is the API, migrations live in Infrastructure):
```powershell
dotnet ef migrations add <Name> --project OrderShieldPro.Infrastructure --startup-project OrderShieldPro.API
dotnet ef database update --project OrderShieldPro.Infrastructure --startup-project OrderShieldPro.API
```

Frontend (from `ordershieldpro-web/`):
```powershell
npx ng serve --port 4300     # MUST be 4300 — see "Ports" below
npx ng build --configuration production
npx ng test --watch=false --browsers=ChromeHeadless
npm run check:i18n           # locale coverage — see "i18n" below
```

Karma needs a Chromium binary. If Chrome is not installed, point it at Edge:
`CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`. Note that
component schematics are configured with `skipTests: true`, so new components get no spec
by default.

If a `dotnet build`/`dotnet test` fails with MSB3027 "file is locked by OrderShieldPro.API",
a dev server is running and holding its own binaries. Either stop it, or build to a scratch
directory with `-o <path>` to verify compilation without touching `bin/`.

VS Code tasks in `.vscode/tasks.json` wrap all of the above — "Start Full Stack (API + Angular)" is the default build task, and "Kill All: Free Ports (5017 + 4300)" clears stuck processes.

`.github/workflows/ci.yml` runs the backend build+test and the frontend `check:i18n` → build →
test. A checked-in pre-commit hook in `.githooks/` runs `check:i18n` when a commit touches
`ordershieldpro-web/`; enable it in a fresh clone with `git config core.hooksPath .githooks`.

IIS deployment: `powershell -ExecutionPolicy Bypass -File .\deploy\build-packages.ps1` produces `artifacts/deploy/{api,frontend}`. See `deploy/README-IIS.md`.

### Ports

The dev server must run on **4300**, not Angular's default 4200. `Program.cs` CORS policy `AllowAngularDev` whitelists only `http://localhost:4300` and `http://192.168.1.2:4300`. The frontend calls `/api` relative (`environment.apiBaseUrl = '/api'` in both dev and prod), so `proxy.conf.json` forwards `/api` → `http://localhost:5017` in the `development` serve configuration; production relies on an IIS reverse proxy doing the same rewrite.

## Backend architecture

Four projects, strict dependency direction `API → Application → Domain`, with `Infrastructure` implementing Application's interfaces:

- **Domain** — entities (`TradeEntity`, `Review`, `WatchRequest`, `SubscriptionRequest`, …), enums, and repository interfaces. No dependencies.
- **Application** — one folder per feature area (`Entities/`, `Reviews/`, `Subscriptions/`, `Users/`, `Notifications/`, `EvidenceNotes/`, `Admin/`), each split into `Commands/`, `Queries/`, `DTOs/`. Every command/query is a MediatR request with a sibling `…Handler` and, where input needs checking, a `…Validator` (FluentValidation). Handlers return `Result` / `Result<T>` (`Common/Models/Result.cs`) rather than throwing for expected failures.
- **Infrastructure** — `ApplicationDbContext` (EF Core + ASP.NET Identity), one `IEntityTypeConfiguration` per entity under `Persistence/Configurations/`, migrations, repositories, `DataSeeder`, and services (`JwtTokenService`, `CurrentUserService`, `EmailService`, `FileStorageService`, `NotificationService`).
- **API** — thin controllers that `_mediator.Send(...)` and map `Result.Succeeded` to `Ok`/`NoContent`/`BadRequest`. Cross-cutting concerns live in middleware and MediatR behaviors, not controllers.

### Secrets and required configuration

`appsettings.json` deliberately contains **no** JWT signing secret and no SMTP password.
`AddInfrastructure(configuration, isDevelopment)` throws at startup outside Development if
`JwtSettings:Secret` is missing or under 32 characters; Development falls back to a marked
dev-only key so local runs work with no setup. Supply real values via `JwtSettings__Secret`
and `EmailSettings__*` environment variables — see `deploy/README-IIS.md`. Email requires
`EmailSettings:AppBaseUrl` to be correct or password reset links point nowhere.

### Files and downloads

All uploads land in one flat `uploads/` directory. `FileStorageService` is the only thing
that touches it, and `ResolveWithinStorageRoot` is the single choke point rejecting any path
that is not a bare filename inside the root — go through `OpenReadAsync`, never build paths
in a controller. Download endpoints address files by **entity id, not stored filename**
(`/api/subscriptions/{requestId}/payment-proof`, `/api/reviews/{reviewId}/evidence/{fileId}`)
and authorize in the query handler: owner or moderator, with unauthorized callers getting the
same "not found" as a missing file. On the frontend these must go through
`FileDownloadService` — a plain anchor `href` cannot carry the bearer token and will 401.

**Attaching review evidence goes through `AttachReviewEvidenceCommand`, never the controller.**
The handler authorizes (reviewer who owns it, or a moderator) *before* anything reaches disk,
then writes both the bytes and the `ReviewEvidenceFile` rows in one place. Those rows are the
only thing the moderation screens read, so storing a file without one makes the evidence
invisible — which is exactly the bug this replaced: the old endpoint wrote to `uploads/`,
returned the path, and persisted nothing. `POST /api/reviews/{id}/evidence` takes multiple
files under the form field `files` (a single `file` is accepted too) and validates extension,
content type, and a 10 MB cap per file. `ReviewsControllerTests` asserts on the persisted rows
rather than the HTTP status, because a 200 with nothing recorded is the failure mode.

Note that `POST /api/reviews` responds `{ id }`, not a `Result` envelope — the frontend read
`result.data` for a while and silently skipped the evidence upload entirely.

Conventions to follow when adding a feature:
- Register nothing by hand — `AddApplication()` scans the assembly for MediatR handlers and FluentValidation validators; `ValidationBehavior` and `LoggingBehavior` are pipeline behaviors applied to every request.
- Throw `NotFoundException` / `ForbiddenAccessException` / `ValidationException` from `Application/Common/Exceptions`; `ExceptionHandlingMiddleware` converts them to `application/problem+json` with camelCase fields and a `traceId`. Never write ad-hoc error shapes in a controller.
- Authorization is role-based via `[Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]`. Roles are `Broker`, `Buyer`, `ServiceTeam`, `Admin`, `SuperAdmin` (`Domain/Enums/UserRole.cs`).
- Rate limiting is opt-in per controller: every controller carries either `[EnableRateLimiting("AuthPolicy")]` (auth and contact) or `[EnableRateLimiting("GeneralPolicy")]`. A new controller with neither is unthrottled. Limits default to 10/min and 100/min and are overridable via `RateLimiting:AuthPermitLimit` / `RateLimiting:GeneralPermitLimit` — the test host raises them so the suite doesn't trip the limiter.
- Health probes: `/health` (liveness, no DB) and `/health/ready` (includes a DbContext check). Both are anonymous and rate-limit exempt.
- Serilog writes rolling daily logs to `logs/` next to the binaries, 30-day retention. Never log a password reset URL or email body — reset tokens are single-use secrets.

Database: SQL Server (`.\SQLEXPRESS`, `OrderShieldProDb`). In Development, `DataSeeder.SeedAsync` runs on every startup and seeds roles, demo users (`admin@ordershieldpro.com`, `gatwaniadmin@ordershieldpro.com` = SuperAdmin, service-team/broker/buyer accounts), subscription plans, and sample entities/reviews. In non-Development, `Database.MigrateAsync()` runs instead — migrations apply automatically on first production start.

Entity moderation: `TradeEntity.IsHidden` is the reversible removal — hidden entities are
filtered out of `SearchAsync` for everyone and return 404 from `GetEntityByIdQuery` unless
the caller is a moderator. Hard deletion is refused while any review references the entity
(`DeleteEntityCommandHandler`), because the `Reviews` foreign key is `DeleteBehavior.Restrict`
and reviews are verified records; admins are told to hide instead.

Review moderation has **two distinct rejection states**, both stored in the same
`Status` string column (no schema migration needed to add one — see below):
`Rejected` means a `Pending` submission was never approved during moderation;
`Hidden` means a review was `Published` and a moderator later withdrew it. They must stay
separate — `GetReviewsByEntityQuery`/`ReviewRepository.GetByEntityIdAsync` only ever show
`Published`, so both look identical to the public, but only `Hidden` reviews belong on the
Admin → Hidden Content restore screen (`GetHiddenReviewsQuery`) and only that transition
re-increments `TradeEntity`'s denormalized review counts on restore. When adding a new way to
remove a review from public view, decide up front whether it's a "never approved" or a
"withdrawn after publish" and use the matching status — reusing `Rejected` for the latter is
the bug this fixed.

Three read models serve a review, and the split is deliberate — do not widen `ReviewDto`:
- `ReviewDto` (`GetReviewsByEntityQuery`, `GetReviewsByUserQuery`, `GetPendingReviewsQuery`)
  is the list shape and carries **no contact fields**, because the same DTO feeds the public
  entity timeline.
- `ReviewModerationDto` (`GET /api/reviews/{id}/moderation`, moderators only) is the dossier:
  the counterparty contact, the reviewer's email, the verification email, and all evidence
  notes including internal ones. None of that may reach a public response.
- `ReviewEditDto` (`GET /api/reviews/{id}/edit`, owner or moderator) is exactly what the
  submit/edit form writes. **The edit form must load from here.** It used to be primed from
  Angular navigation state carrying a list DTO, so the contact fields came back blank and
  saving an edit erased them. It also opens showing an unapproved pending edit rather than the
  older published text, so re-saving cannot silently revert the owner's own changes.

`Review.ContactPosition` records the counterparty's role (owner, purchasing manager, …) — it
matters for weighing a claim, since an owner speaks for the business and a sales rep may not.
Stored as free text (150 chars) so a real title that isn't in the frontend's list still fits.

The admin area (`features/admin/admin-dashboard.component`) is a **two-level shell**: six
sections across the top (Overview, Moderation, Entities, Users, Requests, System) with
sub-tabs underneath, both driven by the declarative `sections` array in the component —
add a tab by adding an entry there, not by editing the template. Sections roll up the
badges of the tabs beneath them, and the active section/tab pair is mirrored into
`?section=&tab=` so reloads and cross-links land in the same place. Badges come from one
`GET /api/admin/nav-counts` call at shell load, because a badge that only appears after you
open its tab is useless; tabs still emit their own count while you work in them. Red badges
mean work is waiting, neutral chips are just list sizes — don't promote a chip to a badge
unless someone has to act on it. `System` is SuperAdmin-only, as are the `pendingUsers` and
`team` tabs inside `Users`.

`HiddenContentComponent` and `AdminApprovalsComponent` each take a `mode` input and are
mounted twice by the shell, once per half — hidden entities under Entities, hidden reviews
under Moderation; action approvals under System, pending registrations under Users. Each
instance emits only the count for what it renders.

Admin → Moderation → the queue card links out to the **review dossier** at
`/admin/reviews/:id` (`features/admin/components/review-dossier/`), a full page over
`GET /api/reviews/{id}/moderation`: the claim, the entity under review, who filed it, the
counterparty contact, the moderation note trail, and the evidence — with the decision
(publish / reject / hide / message / edit / delete) in a sticky bar. It exists because a
moderator cannot judge a submission from a list row, and the queue card alone gave them
nowhere to actually read the attachments.

Hidden material is reached via `GET/PUT /api/entities/hidden` + `.../{id}/visibility` for
entities and `GET /api/reviews/hidden` + `PUT /api/reviews/{id}/status`
(`newStatus: Published` restores) for reviews. Both reuse the existing delete endpoints and
their rules unchanged.

Admin → Entities → All Entities (`features/admin/components/entity-management/`) is the
directory as moderators work with it, over `GET /api/entities/search?includeHidden=true`.
The controller only honours `includeHidden` for moderators and silently serves the public
result set otherwise, so the flag can't be used to probe for hidden entities. Editing is not
duplicated here — the row's Edit action deep-links to the entity profile with `?edit=true`,
which opens its existing edit form once the entity loads.

Admin → Users (`features/admin/components/user-management/`, `GET/PUT/DELETE /api/admin/users`)
is the full directory across every role; `admin/team` is the same data narrowed to admin
roles. **`ApplicationUser.ApprovedAt` is what separates the two reasons an account can be
inactive**, and it must stay that way: `ApprovedAt == null` means a registration nobody has
approved yet (it belongs in the pending queue, where "reject" *deletes* the account),
`ApprovedAt` set with `IsActive == false` means an approved account a moderator froze. Every
pending-registration query filters on both fields — without that, freezing a user would drop
them into the signup queue and one click would delete a real account. This is the same
"never approved" vs. "withdrawn after the fact" distinction as `Rejected` vs. `Hidden` on
reviews. Deleting a user is refused while they own any review or watch request
(`ReviewerId`/`RequestedById` are `DeleteBehavior.Restrict`); freezing is the reversible
removal and the one to reach for, exactly as hiding is for entities.

Admin → Import Entities (`features/admin/components/import-entities/`, `POST /api/entities/import`)
bulk-creates entities from an uploaded spreadsheet. `IEntityImportService` (NPOI-based,
`Infrastructure/Services/EntityImportService.cs`) auto-detects which of two known export
formats the file is in — from its header row(s), not the file extension, since NPOI's
`WorkbookFactory.Create` already reads both legacy `.xls` and OOXML `.xlsx` from the same
stream: **Cantoon** (English headers on row 1, starting "Company Name" — the same layout
as `ATV & UTV Parts.xls`) and **Qicha/企查查** (a disclaimer banner on row 1, Chinese
headers on row 2 starting "企业名称", missing values written as literal `"-"`). Only fields
that map onto `TradeEntity` are extracted — everything else in either template (legal
representative, established date, headcount, email, business-profile paragraph, Qicha's
own duplicate industry taxonomy, etc.) is deliberately dropped. Both formats are China-only
supplier directories with no country column, so `Country` is hardcoded `"China"`.
`ImportEntitiesCommandHandler` dedupes by `LegalName` (ordinal, case-insensitive) both
within the uploaded file and against every entity already in the database, so re-uploading
the same file is safe — it will report everything as skipped duplicates rather than
creating copies. The real template files are checked into
`src/OrderShieldPro.Tests/TestData/` and `EntityImportServiceTests` runs the parser against
them directly; if either export tool ever changes its column layout, that's the test that
catches it, not a production failure.

Notifications are localized via a template mechanism, not stored text: `Notification.TemplateKey` + `Notification.Subject` (e.g. a review title, an entity name) let the frontend render `notification.templates.{key}.title`/`.message` with `{{subject}}` interpolation in the user's language. `Title`/`Message` on the entity remain as an English fallback for the rare notification that is inherently free text (a moderator's direct message has no `TemplateKey` and is shown as authored — it cannot be translated after the fact). When adding a new notification, add both the key/subject at the call site and the three-locale template entries, not just an English string.

`TemplateKey`/`Subject` were added by migration `20260727051758_AddNotificationTemplateFields`;
rows created before it have `TemplateKey = NULL` and are permanently stuck on their old English
text, indistinguishable from the genuinely-free-text case above. `20260730130139_BackfillNotificationTemplateKeys`
recovered the existing rows by `Type` (and, for `NewReviewPendingApproval`/`EnquiryReply`,
which cover more than one template, by matching the old Message text), pulling `Subject` back
out of the quoted text already embedded in it. If a future migration adds another templated
field, backfilling old rows the same way is worth doing at the time — not months later once
the "why is this notification in English" report comes in.

`NotificationsComponent.resolveDestination` is the single place deciding where a notification
click goes, used by both `onNotifClick` and `hasLink` (which decides whether the row even shows
a nav arrow) — the two used to be separate switch statements that drifted: `hasLink` claimed
almost everything was clickable while the destinations included a hardcoded `/admin/approvals`
route that had stopped existing once the admin dashboard moved to `?section=&tab=` query
params, so every SuperAdmin alert (new registration, new review, new enquiry) silently 404'd.
Route a new notification type through this one function, not a second switch statement.
`NewWatchRequestPendingReview` has no real destination today — there is no admin screen for
reviewing a newly submitted enquiry before it's resolved (`ResolveWatchRequestCommand` exists
but no controller endpoint calls it) — it lands on `/admin` rather than nowhere; building that
screen is a separate, larger piece of work.

**Known bug, not just drift:** `Review.PendingEditJson` is `[NotMapped]`, and the file
`20260711000000_AddPendingEditToReview.cs` that looks like it should have added the backing
column is missing the `[Migration("...")]` attribute — EF Core never recognized it as a
migration, so it was never run and the column has never existed in any environment
(confirmed 2026-07-27 via `INFORMATION_SCHEMA.COLUMNS`). The pending-edit approve/reject
workflow therefore only exists in memory for the lifetime of one request and never actually
persists. Fixing this for real means either adding the missing attribute and a proper
migration to create the column, or removing `[NotMapped]` and re-scaffolding — pick one and
verify the round trip; don't just silence the symptom.

The visible symptoms, so they aren't misdiagnosed as separate bugs: editing an **already
published** review leaves the pending-edit diff panel empty (in the queue and on the dossier),
`ApproveReviewEditCommand` fails with "Pending edit data is missing.", and the review is
stranded in `PendingEdit`. Nothing is slow and nothing throws at startup — it is silent data
loss in one workflow. Editing a still-`Pending` review applies in place and is unaffected,
which is why this is easy to miss.

Notable domain behavior: registrations require SuperAdmin approval, so `POST /api/auth/register` returns no JWT and login is refused until the account is activated (integration tests call `TestWebApplicationFactory.ApproveUserAsync`); reviews edited by their owner go back into the moderation queue as a pending-edit snapshot that an admin approves or rejects (`ApproveReviewEditCommand` / `RejectReviewEditCommand`), while owner deletion is immediate.

## Frontend architecture

Angular 19, standalone components only, no NgModules. Routing is fully lazy (`loadComponent`) in `app.routes.ts`; most pages nest under `MainLayoutComponent`, while auth/contact/legal pages sit at the top level outside the layout chrome.

- `core/` — singletons: `ApiService` (thin typed wrapper over `HttpClient` + `environment.apiBaseUrl`), auth (`AuthService`, `TokenService`, `authGuard`, `roleGuard`, `jwtInterceptor`, `errorInterceptor`), `LanguageService`, `ToastService`, `ConfirmService`, `FileDownloadService`, the TypeScript mirrors of backend DTOs/enums in `core/models` + `core/enums`, and pure helpers in `core/utils`.
- `features/` — one folder per route area, each with `.ts`/`.html`/`.scss`. Admin is a shell (`admin-dashboard.component`) with child components per tab (moderation queue, approvals, subscription requests, analytics, team, settings, contact messages), plus the standalone review dossier route.
- `shared/` — presentational components, pipes, and the RTL directive, all re-exported from `shared/index.ts`; import from there.

`core/utils/severity-label.ts` owns the `SeverityLevel` → slug map used for both the
`severity.<slug>` translation key and the `sev-`/`dot-` style hooks. It is a total
`Record<SeverityLevel, string>`, so adding an enum member without a label fails the build —
the previous hand-written `switch` statements covered 8 of 21 and silently defaulted the rest
to `info`, mislabelling reviews in the admin queue. Never reintroduce a local copy.

`EvidenceViewerComponent` (`shared/components/evidence-viewer/`) renders a review's evidence
**in the app** — thumbnails or compact chips plus a full-size overlay with prev/next. Files are
fetched as blobs (the only way the bearer token is attached; a plain `<img src>` to a protected
endpoint 401s), held as object URLs, and revoked on destroy, so nothing is written to the
moderator's disk. `layout="grid"` prefetches renderable files; `layout="compact"` waits for a
click so a long queue doesn't pull every attachment it lists. Formats a browser can't display
fall back to an explicit download. Used by both the queue card and the dossier.

**Signal-effect pitfall this component already hit:** its `effect` must read only its inputs
and do the work inside `untracked()`. The rebuild both reads and writes the `previews` signal,
so running it in the reactive context made the effect depend on a signal it writes — it
re-triggered itself forever and froze the tab. The build was completely green while the page
was unusable, so the spec asserts the component settles after change detection; if the loop
returns, that spec hangs rather than failing.

State uses Angular **signals** (`signal`/`computed`), not RxJS subjects — see `AuthService.currentUser` / `isAuthenticated` / `isAdmin`. Auth state is derived from decoded JWT claims, including the `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` claim URI. `roleGuard` reads allowed roles from route `data.roles`.

### i18n

i18n and RTL are load-bearing: `@ngx-translate` with `src/assets/i18n/{ar,en,zh}.json`, **default language `ar`**. `LanguageService.setLanguage` sets `dir="rtl"` on `<html>` for Arabic. Any new UI must add keys to **`ar` and `en`** and work in RTL. Chinese is hidden from the language selector and is slated for removal, so `zh.json` is no longer kept current — don't add keys to it.

**Some values are stored canonically in English and translated only on display.** Country,
product category, and contact position are persisted as their English label (`"Health &
Medical"`, `"China"`, `"Purchasing Manager"`) so the data stays comparable and a report filed
in Arabic still reads correctly for an English-speaking moderator. The consequence is that
every template rendering one has to translate it, and forgetting to is invisible in review —
it just ships untranslated. Always use the pipe:

```html
{{ review.productCategory | localizeValue:'productCategory' }}
{{ entity.country | localizeValue:'country' }}
{{ entity.productCategories | localizeValue:'productCategory' }}   <!-- comma-separated -->
```

`LocalizeValuePipe` (`shared/pipes/localize-value.pipe.ts`) derives the key by camelCasing the
value (`"Health & Medical"` → `productCategory.healthMedical`), handles comma-separated lists,
and passes unmatched values through unchanged so genuine free text (an "Other" position, a
country not on the list) still displays as authored. It is impure like ngx-translate's own pipe
so it re-renders on a language switch, and memoizes per (value, namespace, language).

Because the key is *derived from the stored value*, a select `<option value="…">` and its
translation key have to agree. They silently didn't for one category — the option was
`"Stationery & Office Supplies"` while the key was `stationeryOffice`, so it could never match.

**`npm run check:i18n`** (`tools/check-i18n.js`) catches all three failure modes: a key used in
a template that exists in no locale, a key present in `en` but not `ar` (or the reverse), and a
stored canonical value with no matching entry. It runs in CI before the build and in the
pre-commit hook. Add keys and re-run it rather than waiting for someone to spot a raw key in
the UI — it found four real bugs on its first run.

Styling: Tailwind v4 (via `@tailwindcss/postcss`) plus a hand-written design-system layer of CSS variables at the top of `src/styles.scss` (navy + teal palette, surfaces, text, severity colors). Angular Material is present for dialogs/snackbars. Use the CSS variables rather than hardcoded hex values.

The submit-review form is **one auto-flowing 3-column grid**, not a stack of fixed rows: the
`<form>` is the grid and every `.form-group` is a direct child, so fields pack into the next
free cell and a conditionally hidden field leaves no hole. Add a field by adding a
`.form-group` — don't wrap groups in row divs, which is what produced the empty cells this
replaced. Long fields (narrative, upload, confirmation, submit) opt out with
`.form-group--full`. Collapses to 2 columns under 1024px and 1 under 640px.

## Design guidance (from `.github/copilot-instructions.md`)

Frontend work should read as **trustworthy, clean, authoritative, modern but not trendy** — users make business decisions on this data. Commit to an intentional aesthetic direction and execute it precisely; use CSS variables for theming; keep responsive and RTL-safe. Avoid generic AI-default aesthetics: Inter/Roboto/Arial as the only choice, purple-gradient-on-white, cookie-cutter card grids with uniform `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`. `ordershieldpro-web/front-end-skill.md` is the longer version of the same guidance.

## Repo hygiene

`bin/`, `obj/`, `dist/`, `.angular/`, `node_modules/`, and `uploads/` are gitignored but exist on disk — ignore them when searching. The `Git: Commit All Changes` VS Code task exists because these were once tracked; it runs `git rm -r --cached` on them before committing.
