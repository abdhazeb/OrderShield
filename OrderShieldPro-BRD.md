# OrderShieldPro — Business Requirements Document

## 1. Executive Summary
OrderShieldPro is a lightweight verification and review platform that protects international brokers and end-buyers from unreliable suppliers (and vice versa). By cataloging verified incident reports and positive transactions, the app provides fast insight into supplier or broker reputation before orders are placed. The MVP favors clarity and speed over complex workflow tooling, surfacing only the essential facts needed to make go/no-go decisions.

## 2. Objectives & Success Metrics
| Objective | KPI | Target (12 months post-launch) |
| --- | --- | --- |
| Build trust for cross-border procurement | % of active users who consult OrderShieldPro before issuing a PO | ≥ 60% |
| Maintain lean contribution pipeline | Avg. review submission time | ≤ 3 minutes |
| Ensure credible intelligence | % of published reviews with verified evidence tag | ≥ 70% |
| Drive marketplace coverage | Unique suppliers/brokers profiled | ≥ 10,000 |

## 3. Target Users
1. **Broker / Trading Office**
   - Needs supplier vetting before committing deposits.
   - Wants alerts when existing factories receive new complaints.
2. **End-Buyer / Importer**
   - Validates broker performance or direct suppliers.
   - Searches by product category, region, severity.
3. **OrderShieldPro Service Team**
   - Performs identity/entity checks via external registries (Chaqiqi, Tianyancha, etc.).
   - Moderates submissions and annotates clarifications from suppliers/brokers.

## 4. Scope
### In-Scope (MVP)
- Supplier/broker directory with unified profile pages.
- Search & filter (name, phone number, WeChat ID, product category, country/region, severity tag).
- Review submission form (structured fields including contact info + optional evidence links/files).
- Verification workflow for service team (internal interface only).
- Review status indicators: Pending, Published, Amended (when counter-evidence is provided).
- Follow/watch list + email/push notifications for new reviews.
- Basic analytics dashboard (internal) showing submission volume, turnaround times.
- Multi-language support (Arabic, English, Chinese) with language switcher.

### Out-of-Scope (Deferred)
- Full dispute resolution or mediation services.
- Quality-control workflow templates, pre-shipment checklists, batch-level evidence management.
- Automated repeat-buyer rate calculations.
- Payment or escrow handling.
- Supplier onboarding / claim rebuttal self-service portal (handled manually MVP).

## 5. Key Features & Requirements
| Feature | Description | Priority |
| --- | --- | --- |
| Profile Search | Global search bar + filters for entity type, region, product category, severity; supports name, phone number, WeChat ID search (scam prevention: same contact info used by renamed entities) | P0 |
| Entity Profile | Summary stats (review count, last incident date, verification badge), timeline of reviews, ability to follow entity; accessed by clicking search results or entity cards | P0 |
| User Profile | Personal account management: submitted reviews, watchlist, notifications, language preference, privacy settings; accessed via Profile tab in bottom navigation | P0 |
| Review Submission | Guided form with required fields: entity name, contact info (phone/WeChat), relationship type, product, incident date, severity tag, narrative; optional proof links & document upload; quick-access button in header and search screen for user convenience | P0 |
| Evidence Annotation | Internal team interface to mark review as "Verified", "Clarified", or "Insufficient" and append summary note visible publicly | P0 |
| Notifications | Email/app alerts when followed entity receives new review or when a submitted review changes status | P1 |
| Watch Requests | Quick request form for non-listed suppliers; notifies service team to investigate and create profile | P1 |
| Entity Investigation Request | When search returns no results, user can request investigation; service team researches entity via external registries and notifies user within 3-5 working days | P1 |
| Language Localization | Support for Arabic (RTL), English, and Chinese; language selector in user profile settings; persists user preference | P0 |
| Credibility Signals | Display reviewer trust score (e.g., # of approved reports) without showing exact transaction counts | P2 |

## 6. Data Model (Conceptual)
- **Entity**: supplier or broker; fields include legal name, trade name, location, categories, verification score, external registry links, phone numbers (array), WeChat IDs (array), historical names (to track rebranding).
- **Review**: entity_id, reviewer_type (broker/buyer), transaction role, incident date, product, severity (Info, Warning, Critical), narrative, evidence links, internal verification status, contact info used (phone/WeChat).
- **User**: role (broker, buyer, service team), email, region, language preference, followed entities, submission history, notification preferences.
- **Evidence Note**: references review_id, authored by service team, short clarification summary.

## 7. User Journeys
1. **Buyer checking supplier**
   - Search supplier by name/phone/WeChat → if not found, request investigation (3-5 days) → if found, view entity profile timeline → review severity tags → decide to proceed or look for alternatives.
2. **Broker reporting issue**
   - Navigate to Submit tab or click quick-submit button → enter entity name and contact info (phone/WeChat for tracking rebrands) → upload PO/invoice snippet → receive status updates → see amended note if supplier responds.
3. **Service team verification**
   - Receive new review queue → confirm entity via external registry (Chaqiqi/Tianyancha) → cross-reference phone/WeChat to detect rebranding → validate evidence → publish or request revision → add clarification note if supplier submits counter-proof.
4. **User managing preferences**
   - Access user profile → adjust language (one-time setting) → manage watchlist and notification preferences → view submitted reviews.

## 8. Assumptions
- Users are comfortable anonymizing sensitive order details; platform will guide them on redaction.
- Service team has access to third-party registry subscriptions for verification.
- Volume of initial reviews manageable by manual moderation (target SLA <48 hours).
- Legal review confirms public incident summaries are permissible with consent from submitter.

## 9. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| False or malicious reviews | Reputational damage, legal exposure | Mandatory evidence links, manual moderation, right-to-clarify statements | 
| Supplier retaliation vs reviewers | User safety concerns | Anonymous public display, internal-only reviewer identity, secure data storage |
| Low adoption due to thin coverage | Limited value | Seed database with verified incidents, partner with procurement forums |
| Verification backlog | Delayed insights | Prioritize severity, triage automation, expand service team as volume grows |

## 10. Compliance & Privacy Considerations
- Store reviewer identities separately with restricted access.
- Clear UI distinction between user profiles (personal account data) and entity profiles (public supplier/broker pages).
- Provide clear ToS outlining acceptable content and liability limits.
- Allow entities to submit clarifications; log audit trail of edits.
- Retain evidence files in encrypted storage; purge upon request once disputes resolved.

## 11. Launch Plan (High Level)
1. **Foundational Build (0-2 months)**: UX/UI, core search, review submission, internal moderation tools.
2. **Beta (2-4 months)**: Onboard pilot brokers/buyers, seed ~500 supplier profiles, iterate on evidence workflow.
3. **Public Launch (4-6 months)**: Marketing push, notification features, watch requests, analytics instrumentation.
4. **Post-Launch Enhancements (6+ months)**: Credibility signals, optional supplier dashboards, regional expansions.

## 12. Open Questions
- ~~Do we need language localization from day one (e.g., English + Mandarin)?~~ **RESOLVED: Yes, launching with Arabic, English, and Chinese (Simplified); language selector in user profile settings**
- ~~Should home screen show statistics dashboard or focus solely on recent reviews for cleaner UX?~~ **RESOLVED: Simplified home screen with recent reviews only; stats/quick actions removed as they duplicate bottom navigation**
- Should we integrate any existing procurement marketplaces for single sign-on or data ingest?
- What is the acceptable SLA for editing a review after supplier clarification (24h vs 72h)?
- Do we need professional translation services or community-driven translations for review content?

---
Prepared for: OrderShieldPro Stakeholders
Date: 2026-02-11
