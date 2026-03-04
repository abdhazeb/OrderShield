@workspace

# OrderShieldPro — Technical Blueprint Prompt

---

## PHASE 0: PLANNING (Generate Plan — Do NOT Write Code)

**Role:** You are a Principal Full-Stack Solution Architect acting as the Tech Lead for this project.

**Goal:** We are building OrderShieldPro — a mobile-first supplier/broker verification and review platform. Analyze the BRD and both prototypes below to produce a **complete Technical Blueprint** covering the .NET 9 backend AND the Angular 19 frontend.

**Inputs Provided:**
1. **BRD:** `E:\OrderShieldPro\OrderShieldPro-BRD.md`
2. **Desktop Prototype:** `E:\OrderShieldPro\prototype.html`
3. **Mobile App Prototype:** `E:\OrderShieldPro\mobile-app-prototype.html`

---

### Architecture Constraints (Non-Negotiable)

#### Backend
* **Framework:** .NET 9 Web API
* **Pattern:** Clean Architecture (Domain → Application → Infrastructure → API)
* **Auth:** ASP.NET Core Identity with JWT Bearer tokens (access + refresh)
* **Database:** Entity Framework Core 9 (Code-First) with SQL Server
* **Logic:** CQRS pattern using MediatR
* **Validation:** FluentValidation
* **Mapping:** Mapster or AutoMapper
* **File Storage:** Azure Blob Storage (or local disk abstraction for dev)
* **Notifications:** Email via SMTP abstraction; push notification placeholder
* **Localization:** Server-side resource files for error messages (ar, en, zh)

#### Frontend
* **Framework:** Angular 19 (standalone components, signals where appropriate)
* **UI Library:** Angular Material + Tailwind CSS
* **State Management:** NgRx Signal Store (lightweight) or Angular signals
* **HTTP:** Angular HttpClient with interceptors for JWT attach & refresh
* **Routing:** Lazy-loaded feature modules with route guards
* **i18n:** Angular built-in i18n OR ngx-translate (Arabic RTL, English, Chinese)
* **Forms:** Reactive Forms with custom validators
* **Mobile-first:** Responsive design matching the mobile prototype; desktop breakpoints matching the desktop prototype

---

### Task: Output a Structured Plan Containing:

#### 1. Domain Entities List
Based on the BRD and prototypes, list every domain entity with its properties and relationships:
- **Entity** (supplier/broker) — legal name, trade names, historical names (rebrand tracking), location (country, region, city), product categories, phone numbers (array), WeChat IDs (array), external registry links, verification status, verification score, listed date
- **Review** — entity reference, reviewer reference, reviewer type (broker/buyer), transaction role, incident date, product, severity (Info/Warning/Critical), title, narrative, order value, evidence links, evidence files, contact info used (phone/WeChat), status (Pending/Published/Amended), created date
- **EvidenceNote** — review reference, authored by service team member, clarification summary, created date, visibility (public/internal)
- **User** — role (Broker, Buyer, ServiceTeam, Admin), subscription tier (Free/Pro/Enterprise), followed entities, language preference, notification preferences
- **WatchRequest** — requested by user, entity name/details provided, investigation status, assigned service team member, result (entity created or not), requested date, resolved date
- **InvestigationRequest** — triggered from "Entity Not Found" on search screen, user reference, search query, status, service team notes, created date
- **Notification** — user reference, type (new review on followed entity, review status change, investigation complete), read status, created date
- **SubscriptionPlan** — name, price, features, limits (review count, watchlist size)

#### 2. Identity Strategy
Specific properties to add to `ApplicationUser` (extending `IdentityUser`):
- `FullName`, `Role` (enum: Broker, Buyer, ServiceTeam, Admin)
- `Region`, `LanguagePreference` (enum: ar, en, zh)
- `SubscriptionTier` (enum: Free, Pro, Enterprise), `SubscriptionExpiryDate`
- `NotificationPreferences` (JSON or related entity)
- `TrustScore` (computed: number of approved reviews)
- `IsActive`, `CreatedAt`, `UpdatedAt`

#### 3. API Endpoint List
Map every controller/action to the specific screens visible in the prototypes:

| Controller | Action | Method | Screen/Feature |
|---|---|---|---|
| **AuthController** | Register | POST | User Profile → Create Account |
| | Login | POST | User Profile → Sign In |
| | RefreshToken | POST | Token refresh |
| | Logout | POST | User Profile → Logout |
| **EntitiesController** | Search | GET | Home → Quick Search, Search screen (name, phone, WeChat, filters) |
| | GetById | GET | Entity Profile screen |
| | GetReviewTimeline | GET | Entity Profile → Review Timeline |
| | FollowEntity | POST | Entity Profile → Follow button |
| | UnfollowEntity | DELETE | Entity Profile → Follow toggle |
| **ReviewsController** | Create | POST | Submit Review screen (full form) |
| | GetByEntity | GET | Entity Profile → Review list |
| | GetByUser | GET | User Profile → My Reviews |
| | GetPendingQueue | GET | Service Team moderation queue |
| | UpdateStatus | PUT | Service Team → Publish/Request revision |
| **EvidenceNotesController** | Create | POST | Service Team → Add clarification |
| | GetByReview | GET | Review detail → Clarification section |
| **WatchRequestsController** | Create | POST | Search → Request Investigation (entity not found) |
| | GetByUser | GET | User Profile → My Watchlist |
| | UpdateStatus | PUT | Service Team → Resolve watch request |
| **NotificationsController** | GetByUser | GET | Notification bell icon |
| | MarkAsRead | PUT | Notification interaction |
| **UserProfileController** | GetProfile | GET | User Profile screen |
| | UpdateProfile | PUT | User Profile → Settings |
| | UpdateLanguage | PUT | User Profile → Language selector |
| | GetWatchlist | GET | User Profile → My Watchlist |
| **SubscriptionsController** | GetPlans | GET | User Profile → Subscription Plans modal |
| | GetCurrentPlan | GET | User Profile → Active plan display |
| | ChangePlan | POST | Subscription Plans → Upgrade/Downgrade |
| **AdminController** | GetDashboard | GET | Internal analytics dashboard |
| | GetSubmissionStats | GET | Submission volume, turnaround times |

#### 4. Backend Folder Structure
```
OrderShieldPro/
├── src/
│   ├── OrderShieldPro.Domain/
│   │   ├── Entities/
│   │   │   ├── Entity.cs
│   │   │   ├── EntityHistoricalName.cs
│   │   │   ├── EntityContactInfo.cs
│   │   │   ├── Review.cs
│   │   │   ├── EvidenceNote.cs
│   │   │   ├── WatchRequest.cs
│   │   │   ├── InvestigationRequest.cs
│   │   │   ├── Notification.cs
│   │   │   └── SubscriptionPlan.cs
│   │   ├── Enums/
│   │   │   ├── EntityType.cs           (Supplier, Broker)
│   │   │   ├── SeverityLevel.cs        (Info, Warning, Critical)
│   │   │   ├── ReviewStatus.cs         (Pending, Published, Amended)
│   │   │   ├── ReviewerType.cs         (Broker, Buyer)
│   │   │   ├── UserRole.cs             (Broker, Buyer, ServiceTeam, Admin)
│   │   │   ├── SubscriptionTier.cs     (Free, Pro, Enterprise)
│   │   │   ├── Language.cs             (ar, en, zh)
│   │   │   └── VerificationStatus.cs   (Verified, Clarified, Insufficient)
│   │   ├── Common/
│   │   │   ├── BaseEntity.cs
│   │   │   └── AuditableEntity.cs
│   │   └── Interfaces/
│   │       ├── IEntityRepository.cs
│   │       ├── IReviewRepository.cs
│   │       └── IUnitOfWork.cs
│   ├── OrderShieldPro.Application/
│   │   ├── Common/
│   │   │   ├── Interfaces/
│   │   │   │   ├── IApplicationDbContext.cs
│   │   │   │   ├── IFileStorageService.cs
│   │   │   │   ├── IEmailService.cs
│   │   │   │   └── ICurrentUserService.cs
│   │   │   ├── Behaviors/
│   │   │   │   ├── ValidationBehavior.cs
│   │   │   │   └── LoggingBehavior.cs
│   │   │   ├── Mappings/
│   │   │   │   └── MappingProfile.cs
│   │   │   └── Models/
│   │   │       ├── PaginatedList.cs
│   │   │       └── Result.cs
│   │   ├── Entities/
│   │   │   ├── Commands/ (CreateEntity, UpdateEntity)
│   │   │   └── Queries/ (SearchEntities, GetEntityById)
│   │   ├── Reviews/
│   │   │   ├── Commands/ (CreateReview, UpdateReviewStatus)
│   │   │   └── Queries/ (GetReviewsByEntity, GetReviewsByUser, GetPendingReviews)
│   │   ├── EvidenceNotes/
│   │   │   ├── Commands/ (CreateEvidenceNote)
│   │   │   └── Queries/ (GetEvidenceNotesByReview)
│   │   ├── WatchRequests/
│   │   │   ├── Commands/ (CreateWatchRequest, ResolveWatchRequest)
│   │   │   └── Queries/ (GetWatchRequestsByUser)
│   │   ├── Notifications/
│   │   │   ├── Commands/ (MarkNotificationAsRead)
│   │   │   └── Queries/ (GetUserNotifications)
│   │   ├── Users/
│   │   │   ├── Commands/ (UpdateProfile, UpdateLanguage, FollowEntity, UnfollowEntity)
│   │   │   └── Queries/ (GetUserProfile, GetUserWatchlist)
│   │   └── Subscriptions/
│   │       ├── Commands/ (ChangePlan)
│   │       └── Queries/ (GetPlans, GetCurrentPlan)
│   ├── OrderShieldPro.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── Configurations/ (entity type configurations)
│   │   │   ├── Migrations/
│   │   │   └── Repositories/
│   │   ├── Identity/
│   │   │   ├── ApplicationUser.cs
│   │   │   ├── IdentityService.cs
│   │   │   └── JwtTokenService.cs
│   │   ├── Services/
│   │   │   ├── FileStorageService.cs
│   │   │   ├── EmailService.cs
│   │   │   └── CurrentUserService.cs
│   │   └── DependencyInjection.cs
│   └── OrderShieldPro.API/
│       ├── Controllers/
│       │   ├── AuthController.cs
│       │   ├── EntitiesController.cs
│       │   ├── ReviewsController.cs
│       │   ├── EvidenceNotesController.cs
│       │   ├── WatchRequestsController.cs
│       │   ├── NotificationsController.cs
│       │   ├── UserProfileController.cs
│       │   ├── SubscriptionsController.cs
│       │   └── AdminController.cs
│       ├── Middleware/
│       │   ├── ExceptionHandlingMiddleware.cs
│       │   └── RequestLoggingMiddleware.cs
│       ├── Filters/
│       │   └── ApiExceptionFilterAttribute.cs
│       ├── Program.cs
│       └── appsettings.json
└── tests/
    ├── OrderShieldPro.Domain.Tests/
    ├── OrderShieldPro.Application.Tests/
    └── OrderShieldPro.API.Tests/
```

#### 5. Angular Frontend Structure
```
ordershieldpro-web/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── token.service.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── jwt.interceptor.ts
│   │   │   │   │   └── error.interceptor.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── role.guard.ts
│   │   │   │   └── models/
│   │   │   │       ├── auth-request.model.ts
│   │   │   │       └── auth-response.model.ts
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts            (base HTTP wrapper)
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── language.service.ts
│   │   │   ├── models/
│   │   │   │   ├── entity.model.ts
│   │   │   │   ├── review.model.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   ├── evidence-note.model.ts
│   │   │   │   ├── watch-request.model.ts
│   │   │   │   ├── notification.model.ts
│   │   │   │   ├── subscription.model.ts
│   │   │   │   └── paginated-result.model.ts
│   │   │   └── enums/
│   │   │       ├── entity-type.enum.ts
│   │   │       ├── severity-level.enum.ts
│   │   │       ├── review-status.enum.ts
│   │   │       └── subscription-tier.enum.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── header/                   (app header + search bar + Write Review button)
│   │   │   │   ├── bottom-nav/               (mobile bottom navigation: Home, Search, Submit, Profile)
│   │   │   │   ├── entity-card/              (reusable entity card with badges)
│   │   │   │   ├── review-card/              (review item with severity badge + clarification)
│   │   │   │   ├── severity-badge/           (Info/Warning/Critical badge)
│   │   │   │   ├── search-bar/               (global search input with filter button)
│   │   │   │   ├── language-selector/        (AR/EN/ZH modal selector)
│   │   │   │   ├── stat-card/                (stat display: value + label)
│   │   │   │   ├── file-upload/              (evidence upload component)
│   │   │   │   ├── loading-spinner/
│   │   │   │   └── empty-state/
│   │   │   ├── pipes/
│   │   │   │   ├── relative-date.pipe.ts
│   │   │   │   └── truncate.pipe.ts
│   │   │   ├── directives/
│   │   │   │   └── rtl.directive.ts          (RTL support for Arabic)
│   │   │   └── shared.module.ts
│   │   ├── features/
│   │   │   ├── home/
│   │   │   │   ├── home.component.ts         (Recent Reviews list, quick search)
│   │   │   │   ├── home.component.html
│   │   │   │   └── home.routes.ts
│   │   │   ├── search/
│   │   │   │   ├── search.component.ts       (search input, filter modal, results list)
│   │   │   │   ├── search.component.html
│   │   │   │   ├── search-filters/           (filter bottom sheet: entity type, country, category, severity)
│   │   │   │   ├── no-results/               ("Entity Not Found" + Request Investigation CTA)
│   │   │   │   ├── services/
│   │   │   │   │   └── search.service.ts
│   │   │   │   └── search.routes.ts
│   │   │   ├── entity-profile/
│   │   │   │   ├── entity-profile.component.ts   (profile header, stats grid, review timeline)
│   │   │   │   ├── entity-profile.component.html
│   │   │   │   ├── components/
│   │   │   │   │   ├── profile-header/       (name, badges, location, categories, follow/review buttons)
│   │   │   │   │   ├── profile-stats/        (Reviews, Positive, Warnings, Critical counts)
│   │   │   │   │   └── review-timeline/      (chronological review list with clarification boxes)
│   │   │   │   ├── services/
│   │   │   │   │   └── entity.service.ts
│   │   │   │   └── entity-profile.routes.ts
│   │   │   ├── submit-review/
│   │   │   │   ├── submit-review.component.ts    (guided form: entity info, contact, relationship, severity, narrative, evidence)
│   │   │   │   ├── submit-review.component.html
│   │   │   │   ├── components/
│   │   │   │   │   ├── severity-selector/    (3-option selector: Info, Warning, Critical)
│   │   │   │   │   └── evidence-uploader/    (file upload + link input)
│   │   │   │   ├── services/
│   │   │   │   │   └── review.service.ts
│   │   │   │   └── submit-review.routes.ts
│   │   │   ├── user-profile/
│   │   │   │   ├── user-profile.component.ts     (logged-out: sign-in + subscription plans; logged-in: activity + settings)
│   │   │   │   ├── user-profile.component.html
│   │   │   │   ├── components/
│   │   │   │   │   ├── logged-out-view/      (Sign In Required + subscription plan cards + Create Account/Sign In)
│   │   │   │   │   ├── logged-in-view/       (avatar, stats, activity links, subscription, settings, logout)
│   │   │   │   │   ├── subscription-plans/   (Free/Pro/Enterprise plan cards modal)
│   │   │   │   │   ├── my-reviews/           (list of user's submitted reviews)
│   │   │   │   │   ├── my-watchlist/         (followed entities list)
│   │   │   │   │   └── notification-settings/
│   │   │   │   ├── services/
│   │   │   │   │   └── user-profile.service.ts
│   │   │   │   └── user-profile.routes.ts
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   ├── login.component.ts
│   │   │   │   │   └── login.component.html
│   │   │   │   ├── register/
│   │   │   │   │   ├── register.component.ts
│   │   │   │   │   └── register.component.html
│   │   │   │   └── auth.routes.ts
│   │   │   └── admin/                        (service team internal interface)
│   │   │       ├── moderation-queue/         (pending reviews queue)
│   │   │       ├── review-detail/            (verify, clarify, publish actions)
│   │   │       ├── investigation-queue/      (watch requests / investigation requests)
│   │   │       ├── analytics-dashboard/      (submission volume, turnaround times)
│   │   │       └── admin.routes.ts
│   │   ├── layouts/
│   │   │   ├── main-layout/                  (header + bottom-nav + router-outlet)
│   │   │   └── admin-layout/                 (sidebar + router-outlet for service team)
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── assets/
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   ├── ar.json
│   │   │   └── zh.json
│   │   └── images/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── styles/
│   │   ├── _variables.scss
│   │   ├── _rtl.scss
│   │   └── styles.scss
│   └── index.html
├── angular.json
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

#### 6. Screen-to-Component Mapping (from Prototypes)

| Prototype Screen | Angular Route | Component | API Calls |
|---|---|---|---|
| **Home** (recent reviews, search bar, Write Review btn) | `/` | `HomeComponent` | `GET /api/entities/search?sort=recent` |
| **Search** (search input, filters, results list) | `/search` | `SearchComponent` | `GET /api/entities/search?q=&filters=` |
| **Search → No Results** (investigation request) | `/search` (state) | `NoResultsComponent` | `POST /api/watch-requests` |
| **Entity Profile** (header, stats, review timeline) | `/entity/:id` | `EntityProfileComponent` | `GET /api/entities/:id`, `GET /api/reviews?entityId=:id` |
| **Submit Review** (full guided form) | `/submit` | `SubmitReviewComponent` | `POST /api/reviews`, `POST /api/files/upload` |
| **User Profile (logged out)** (sign-in, plans) | `/profile` | `LoggedOutViewComponent` | `GET /api/subscriptions/plans` |
| **User Profile (logged in)** (activity, settings) | `/profile` | `LoggedInViewComponent` | `GET /api/profile`, `GET /api/subscriptions/current` |
| **Login** | `/auth/login` | `LoginComponent` | `POST /api/auth/login` |
| **Register** | `/auth/register` | `RegisterComponent` | `POST /api/auth/register` |
| **Language Selector** (modal) | Any screen (modal) | `LanguageSelectorComponent` | `PUT /api/profile/language` |
| **Filter Modal** (bottom sheet) | `/search` (modal) | `SearchFiltersComponent` | — (client-side params) |
| **Subscription Plans** (modal) | `/profile` (modal) | `SubscriptionPlansComponent` | `GET /api/subscriptions/plans`, `POST /api/subscriptions/change` |
| **Admin: Moderation Queue** | `/admin/queue` | `ModerationQueueComponent` | `GET /api/reviews/pending` |
| **Admin: Review Detail** | `/admin/review/:id` | `ReviewDetailComponent` | `PUT /api/reviews/:id/status`, `POST /api/evidence-notes` |
| **Admin: Analytics** | `/admin/analytics` | `AnalyticsDashboardComponent` | `GET /api/admin/dashboard` |

---
---

## PHASE 1–10: IMPLEMENTATION PROMPTS

> **Instructions:** Execute each prompt sequentially. Each prompt builds on the output of the previous one. Copy-paste each prompt into a new conversation when ready to implement that phase.

---

### PROMPT 1 — Backend Solution Scaffold & Domain Layer

```
@workspace
Role: Senior .NET Architect.

Context: We have a completed Technical Blueprint in prompt.md (Phase 0). 
Reference: E:\OrderShieldPro\prompt.md, E:\OrderShieldPro\OrderShieldPro-BRD.md

Task: Create the .NET 9 solution scaffold and implement the entire Domain layer.

Steps:
1. Create the solution with 4 projects following Clean Architecture:
   - OrderShieldPro.Domain (Class Library)
   - OrderShieldPro.Application (Class Library)
   - OrderShieldPro.Infrastructure (Class Library)
   - OrderShieldPro.API (Web API)
   Add project references: API → Application + Infrastructure, Infrastructure → Application, Application → Domain.

2. In OrderShieldPro.Domain, create:
   a. Common/BaseEntity.cs (Id as Guid, CreatedAt, UpdatedAt)
   b. Common/AuditableEntity.cs (extends BaseEntity with CreatedBy, UpdatedBy)
   c. All Enums: EntityType, SeverityLevel, ReviewStatus, ReviewerType, UserRole, SubscriptionTier, Language, VerificationStatus
   d. All Entities exactly as specified in the blueprint:
      - Entity (supplier/broker with arrays for PhoneNumbers, WeChatIds, HistoricalNames)
      - Review (with all fields including ContactInfoUsed)
      - EvidenceNote
      - WatchRequest
      - InvestigationRequest  
      - Notification
      - SubscriptionPlan
   e. Interfaces: IEntityRepository, IReviewRepository, IUnitOfWork

3. Ensure all navigation properties and relationships are correct.

Output: Working solution that compiles. Show the full code for every file.
```

---

### PROMPT 2 — Infrastructure Layer: DbContext, Identity & EF Configurations

```
@workspace
Role: Senior .NET Architect.

Context: Domain layer is complete. Now build the Infrastructure layer.
Reference: E:\OrderShieldPro\prompt.md (Phase 0 blueprint)

Task: Implement the Infrastructure layer with EF Core, Identity, and JWT.

Steps:
1. Install NuGet packages:
   - Microsoft.AspNetCore.Identity.EntityFrameworkCore
   - Microsoft.EntityFrameworkCore.SqlServer
   - Microsoft.EntityFrameworkCore.Tools
   - Microsoft.AspNetCore.Authentication.JwtBearer
   - MediatR, FluentValidation.DependencyInjection

2. Create Identity/ApplicationUser.cs extending IdentityUser:
   - Add: FullName, Role (UserRole enum), Region, LanguagePreference (Language enum), SubscriptionTier, SubscriptionExpiryDate, NotificationPreferencesJson, TrustScore, IsActive, CreatedAt, UpdatedAt
   - Navigation properties: FollowedEntities (many-to-many), Reviews, WatchRequests

3. Create Persistence/ApplicationDbContext.cs:
   - Extend IdentityDbContext<ApplicationUser>
   - DbSets for all domain entities
   - Override OnModelCreating with Fluent API configurations

4. Create Persistence/Configurations/ — one file per entity:
   - EntityConfiguration.cs (indexes on Name, PhoneNumbers, WeChatIds for search; configure arrays as owned types or JSON columns)
   - ReviewConfiguration.cs
   - EvidenceNoteConfiguration.cs
   - WatchRequestConfiguration.cs, etc.

5. Create Identity/JwtTokenService.cs:
   - Generate access token (claims: UserId, Email, Role, SubscriptionTier)
   - Generate refresh token
   - Validate refresh token

6. Create Persistence/Repositories/ implementing domain interfaces.

7. Create Services/: CurrentUserService, FileStorageService (local disk for dev), EmailService (placeholder).

8. Create DependencyInjection.cs — register all services.

9. Generate initial EF migration.

Output: All files with full code. Ensure it compiles and migration generates cleanly.
```

---

### PROMPT 3 — Application Layer: CQRS Commands & Queries

```
@workspace
Role: Senior .NET Architect.

Context: Domain and Infrastructure layers are complete.
Reference: E:\OrderShieldPro\prompt.md (Phase 0 blueprint — API Endpoint List)

Task: Implement all Application layer CQRS handlers using MediatR.

Steps:
1. Create Common/:
   - Interfaces/IApplicationDbContext.cs
   - Behaviors/ValidationBehavior.cs (MediatR pipeline with FluentValidation)
   - Behaviors/LoggingBehavior.cs
   - Models/Result.cs (Success/Failure wrapper)
   - Models/PaginatedList.cs
   - Mappings/MappingProfile.cs

2. Create DTOs for every entity (in each feature folder):
   - EntityDto, EntitySearchResultDto, EntityDetailDto
   - ReviewDto, ReviewCreateDto, ReviewListDto
   - EvidenceNoteDto
   - UserProfileDto, UpdateProfileDto
   - WatchRequestDto
   - NotificationDto
   - SubscriptionPlanDto

3. Implement CQRS for Entities/:
   - Commands: CreateEntityCommand, UpdateEntityCommand
   - Queries: SearchEntitiesQuery (supports name, phone, WeChat, filters for type/country/category/severity, pagination), GetEntityByIdQuery
   - Validators for each command

4. Implement CQRS for Reviews/:
   - Commands: CreateReviewCommand (with file upload handling), UpdateReviewStatusCommand
   - Queries: GetReviewsByEntityQuery, GetReviewsByUserQuery, GetPendingReviewsQuery
   - Validators (min 100 chars narrative, required fields matching the Submit Review form)

5. Implement CQRS for EvidenceNotes/:
   - Commands: CreateEvidenceNoteCommand
   - Queries: GetEvidenceNotesByReviewQuery

6. Implement CQRS for WatchRequests/, Notifications/, Users/, Subscriptions/

7. Wire up DependencyInjection for Application layer.

Output: All handler files with full implementation. Ensure all validators match the form fields from the prototypes.
```

---

### PROMPT 4 — API Layer: Controllers, Middleware & Program.cs

```
@workspace
Role: Senior .NET Architect.

Context: Domain, Application, and Infrastructure layers are complete.
Reference: E:\OrderShieldPro\prompt.md (Phase 0 blueprint — API Endpoint List table)

Task: Implement the API layer — all controllers, middleware, and configuration.

Steps:
1. Configure Program.cs:
   - Add all DI registrations (Application + Infrastructure)
   - Configure Identity + JWT Bearer authentication
   - Configure CORS for Angular dev server (http://localhost:4200)
   - Configure Swagger/OpenAPI
   - Add exception handling middleware
   - Add request logging middleware
   - Configure localization (ar, en, zh)

2. Create all Controllers exactly as listed in the blueprint:
   - AuthController (Register, Login, RefreshToken, Logout)
   - EntitiesController (Search, GetById, GetReviewTimeline, FollowEntity, UnfollowEntity)
   - ReviewsController (Create with file upload, GetByEntity, GetByUser, GetPendingQueue, UpdateStatus)
   - EvidenceNotesController (Create, GetByReview)
   - WatchRequestsController (Create, GetByUser, UpdateStatus)
   - NotificationsController (GetByUser, MarkAsRead)
   - UserProfileController (GetProfile, UpdateProfile, UpdateLanguage, GetWatchlist)
   - SubscriptionsController (GetPlans, GetCurrentPlan, ChangePlan)
   - AdminController (GetDashboard, GetSubmissionStats)

3. Apply [Authorize] attributes:
   - Public: AuthController (Register, Login), EntitiesController (Search, GetById)
   - Authenticated: ReviewsController (Create), UserProfileController, NotificationsController
   - ServiceTeam/Admin: ReviewsController (GetPendingQueue, UpdateStatus), EvidenceNotesController, AdminController

4. Create Middleware/:
   - ExceptionHandlingMiddleware.cs (global error handling, returns ProblemDetails)
   - RequestLoggingMiddleware.cs

5. Create appsettings.json with JWT settings, connection string, file storage config.

Output: Full code for every file. Ensure the API starts and Swagger shows all endpoints.
```

---

### PROMPT 5 — Database Seed & Backend Testing

```
@workspace
Role: Senior .NET Architect.

Context: Full backend is implemented.

Task: Seed the database with realistic demo data and write essential tests.

Steps:
1. Create a data seeder that runs on first startup:
   - 3 subscription plans (Free, Pro, Enterprise) with correct limits from prototype
   - 5 sample entities (suppliers/brokers) matching the prototype demo data:
     * Shenzhen Aluminum Manufacturing Co., Ltd. (Supplier, Shenzhen, Metals)
     * Global Trade Bridge Ltd. (Broker, Hong Kong, General Trading)
     * Ningbo Electronics Factory (Supplier, Ningbo, Electronics)
     * 2 more varied entities
   - 15+ sample reviews with varied severity levels matching prototype timeline
   - 2 evidence notes (clarifications) matching the prototype
   - 1 service team user, 2 demo users (broker, buyer)
   - Sample watch requests and notifications

2. Write unit tests for:
   - SearchEntitiesQuery handler (search by name, phone, WeChat)
   - CreateReviewCommand handler (validation, happy path)
   - JwtTokenService (token generation, validation)

3. Write integration tests for:
   - AuthController (register, login flow)
   - EntitiesController (search, get by id)
   - ReviewsController (create review, get reviews)

Output: Seed data code + test files. Run tests and show results.
```

---

### PROMPT 6 — Angular Project Scaffold & Core Module

```
@workspace
Role: Senior Angular Architect.

Context: Backend API is complete and running. Now build the Angular 19 frontend.
Reference: E:\OrderShieldPro\prompt.md (Phase 0 blueprint — Angular Frontend Structure)
Prototypes: E:\OrderShieldPro\mobile-app-prototype.html, E:\OrderShieldPro\prototype.html

Task: Scaffold the Angular project and implement the core module.

Steps:
1. Create Angular 19 project with standalone components:
   - ng new ordershieldpro-web --standalone --style=scss --routing
   - Install: @angular/material, tailwindcss, @ngx-translate/core, @ngx-translate/http-loader

2. Configure Tailwind CSS (tailwind.config.js with the prototype's color palette: blue-900 #1e3a8a, blue-500 #3b82f6, slate tones).

3. Create core/auth/:
   - services/auth.service.ts (login, register, logout, refreshToken, currentUser signal)
   - services/token.service.ts (store/retrieve/clear JWT from localStorage)
   - interceptors/jwt.interceptor.ts (attach Bearer token to requests)
   - interceptors/error.interceptor.ts (handle 401 → refresh, 403, 500)
   - guards/auth.guard.ts (redirect to login if not authenticated)
   - guards/role.guard.ts (restrict admin routes to ServiceTeam/Admin role)
   - models/auth-request.model.ts, auth-response.model.ts

4. Create core/models/ — TypeScript interfaces matching all backend DTOs:
   - entity.model.ts, review.model.ts, user.model.ts, evidence-note.model.ts
   - watch-request.model.ts, notification.model.ts, subscription.model.ts
   - paginated-result.model.ts

5. Create core/enums/ matching backend enums.

6. Create core/services/:
   - api.service.ts (base URL from environment, generic GET/POST/PUT/DELETE)
   - language.service.ts (load translations, switch language, persist to localStorage, apply RTL for Arabic)
   - notification.service.ts

7. Create environments/ with API base URL (https://localhost:7xxx/api).

8. Set up i18n:
   - assets/i18n/en.json, ar.json, zh.json with all UI strings from the mobile prototype's translations object
   - Configure ngx-translate in app.config.ts

9. Set up app.routes.ts with lazy-loaded routes matching the blueprint.

Output: Full project that compiles and runs with `ng serve`. Show all files.
```

---

### PROMPT 7 — Shared Components & Layout

```
@workspace
Role: Senior Angular Architect.

Context: Angular core module is complete.
Reference: E:\OrderShieldPro\mobile-app-prototype.html (for mobile UI), E:\OrderShieldPro\prototype.html (for desktop UI)

Task: Build all shared components and the app layout matching the prototypes exactly.

Steps:
1. Create layouts/main-layout/:
   - Desktop: header with logo + nav links (Home, Search, Submit Review, Profile) matching prototype.html
   - Mobile: app-header (gradient blue, title, notification bell) + bottom-nav (Home, Search, Submit, Profile) matching mobile prototype
   - Use CSS breakpoints: mobile-first, desktop at ≥768px

2. Create shared/components/:
   a. header/ — gradient blue header with logo "🛡️ OrderShieldPro", search bar, Write Review button
   b. bottom-nav/ — fixed bottom bar with 4 tabs (🏠 Home, 🔍 Search, ✍️ Submit, 👤 Profile), active state highlighting
   c. entity-card/ — reusable card component matching prototype: entity name, type badge, location, category, verified badge, severity stat badges (Info/Warning/Critical counts)
   d. review-card/ — review item: severity badge, date, title, content, reviewer info, optional clarification box (yellow background)
   e. severity-badge/ — color-coded badge (blue=Info, orange=Warning, red=Critical)
   f. search-bar/ — white rounded input with 🔍 icon and ⚙️ filter button
   g. stat-card/ — centered value + label (used in profile stats)
   h. file-upload/ — dashed border upload area with 📎 icon
   i. language-selector/ — bottom sheet modal with EN/AR/ZH options and checkmarks
   j. loading-spinner/, empty-state/

3. Create shared/pipes/:
   - relative-date.pipe.ts (e.g., "Jan 28, 2026" → formatted date)
   - truncate.pipe.ts

4. Create shared/directives/:
   - rtl.directive.ts (adds RTL direction when Arabic is active)

5. Style everything to match the prototypes' exact colors, spacing, border-radius, and shadows.

Output: All component files. Verify with `ng serve` that the layout renders correctly.
```

---

### PROMPT 8 — Feature Pages: Home, Search & Entity Profile

```
@workspace
Role: Senior Angular Architect.

Context: Shared components and layout are complete.
Reference: Mobile prototype screens (Home, Search, Entity Profile) and desktop prototype.

Task: Implement the Home, Search, and Entity Profile feature pages.

Steps:
1. features/home/:
   - HomeComponent: displays "Recent Reviews" section title with "See All" link
   - Render list of entity-cards from API (GET /api/entities/search?sort=recent)
   - Quick search input that navigates to /search with query param
   - "Write Review" button navigating to /submit

2. features/search/:
   - SearchComponent: active search input with real-time search (debounce 300ms)
   - Support search by name, phone number, WeChat ID (matching BRD requirement)
   - SearchFiltersComponent: bottom sheet modal with dropdowns for Entity Type, Country/Region, Product Category, Severity Filter (matching filter modal in mobile prototype)
   - Results count display "(23 matches)"
   - List of entity-cards from search results
   - NoResultsComponent: when 0 results, show "Entity Not Found" alert with "Request Investigation" button that calls POST /api/watch-requests

3. features/entity-profile/:
   - EntityProfileComponent: loads entity by route param :id
   - ProfileHeaderComponent: entity name, type badge, verified badge, location, categories, listed date — with "Follow" and "Write Review" action buttons
   - ProfileStatsComponent: 4-column grid showing Total Reviews, Positive, Warnings, Critical counts
   - ReviewTimelineComponent: chronological list of reviews with severity badges, dates, titles, content, reviewer meta, and clarification boxes where present
   - Wire up FollowEntity/UnfollowEntity API calls
   - "Write Review" navigates to /submit with entity pre-populated

4. All pages must be responsive (mobile-first layout matching mobile prototype, expanding to desktop layout from prototype.html at ≥768px).

Output: Full implementation of all three feature pages with API integration.
```

---

### PROMPT 9 — Feature Pages: Submit Review, User Profile & Auth

```
@workspace
Role: Senior Angular Architect.

Context: Home, Search, Entity Profile pages are done.
Reference: Mobile prototype (Submit Review screen, User Profile screen — both logged-out and logged-in views)

Task: Implement Submit Review, User Profile, and Auth feature pages.

Steps:
1. features/submit-review/:
   - SubmitReviewComponent: guided reactive form matching the prototype exactly:
     * Info alert: "Your review will be verified by our team before publication..."
     * Entity Name (text input with autocomplete suggestion from search API)
     * Contact Information — Phone/WeChat (with helper text about rebrand tracking)
     * Entity Type (select: Supplier, Broker/Trading Office)
     * Your Relationship (select: Broker→Supplier, Buyer→Supplier, Buyer→Broker)
     * Product Category (select matching prototype options)
     * Transaction Date (date picker)
     * Severity selector (3 visual cards: ℹ️ Info, ⚠️ Warning, 🚨 Critical — matching prototype)
     * Review Title
     * Description (textarea, min 100 chars validation)
     * Order Value (optional, number)
     * Evidence upload (file upload + link input)
     * Email for verification
     * Confirmation checkbox
     * Submit button → POST /api/reviews → success toast → navigate home

2. features/user-profile/:
   - LoggedOutViewComponent: matching prototype exactly:
     * 🔒 icon, "Sign In Required" message
     * Subscription plan cards (Free $0, Pro $29 Popular, Enterprise Custom)
     * "Create Account" and "Sign In" buttons
     * Help & Support section
   - LoggedInViewComponent: matching prototype exactly:
     * User avatar, name, email
     * Stats row: My Reviews count, Watching count
     * Activity sections: Reviews Submitted, My Watchlist, Notifications (with → links)
     * Subscription section: current plan card with "Manage Plan" button
     * Account Settings: Language (opens language selector modal), Privacy & Security
     * Help & Support, Logout
   - SubscriptionPlansComponent: modal/bottom-sheet with 3 plan cards (Free/Pro/Enterprise)

3. features/auth/:
   - LoginComponent: email + password form → POST /api/auth/login → store token → navigate to profile
   - RegisterComponent: full name, email, password, role selection, language preference → POST /api/auth/register

4. Connect auth state to user-profile view switching (logged-out vs logged-in).

Output: Full implementation. All forms must validate exactly like the prototypes specify.
```

---

### PROMPT 10 — Admin Panel, Notifications & Final Polish

```
@workspace
Role: Senior Angular Architect.

Context: All public-facing features are complete.
Reference: BRD sections on verification workflow and service team interface.

Task: Implement the admin panel, notification system, and apply final polish.

Steps:
1. features/admin/ (route guarded to ServiceTeam/Admin role):
   - ModerationQueueComponent: table/list of pending reviews with severity badges, entity name, submission date, reviewer info. Click opens detail.
   - ReviewDetailComponent: full review display + action buttons:
     * "Publish" — sets status to Published
     * "Request Revision" — sends back to reviewer
     * "Add Clarification" — opens form to create EvidenceNote (matching the clarification box from prototypes)
   - InvestigationQueueComponent: list of WatchRequests and InvestigationRequests with status, assigned member, actions
   - AnalyticsDashboardComponent: submission volume, average turnaround time, verification rate (cards + simple charts)
   - AdminLayoutComponent: sidebar navigation (Queue, Investigations, Analytics)

2. Notification system:
   - Notification bell icon in header showing unread count
   - Dropdown panel listing recent notifications
   - Mark as read on click
   - Real-time polling every 30 seconds (or SignalR placeholder)

3. Final polish:
   - Verify all 3 languages work (EN, AR with RTL, ZH) across every screen
   - Verify responsive breakpoints: mobile (≤414px matching prototype), tablet, desktop (≥768px matching desktop prototype)
   - Add loading states and error handling for all API calls
   - Add toast notifications for actions (review submitted, entity followed, etc.)
   - Add smooth page transitions
   - Verify route guards (unauthenticated users redirected from protected routes)
   - Test the full user journey: Search → Entity Profile → Submit Review → Check profile

Output: Complete admin panel, notification system, and polished frontend. List any remaining TODOs.
```


