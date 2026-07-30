import { SeverityLevel } from '../enums';

/**
 * Maps a SeverityLevel to its slug. Used both for the `severity.<slug>` i18n key and
 * for the `sev-<slug>` / `dot-<slug>` style hooks, so a new severity gets a label and
 * a colour from one place.
 *
 * Every enum member must be listed: a missing entry used to silently fall back to
 * "info", which mislabelled reviews in the admin queue.
 */
const SEVERITY_SLUGS: Record<SeverityLevel, string> = {
  [SeverityLevel.Info]: 'info',
  [SeverityLevel.Warning]: 'warning',
  [SeverityLevel.Critical]: 'critical',
  [SeverityLevel.Behavior]: 'behavior',
  [SeverityLevel.Fraud]: 'fraud',
  [SeverityLevel.Quality]: 'quality',
  [SeverityLevel.Delivery]: 'delivery',
  [SeverityLevel.Payment]: 'payment',
  [SeverityLevel.FinanciallyDistressed]: 'financiallyDistressed',
  [SeverityLevel.Bankrupt]: 'bankrupt',
  [SeverityLevel.PoorManagement]: 'poorManagement',
  [SeverityLevel.InaccurateAppointments]: 'inaccurateAppointments',
  [SeverityLevel.BribeOthers]: 'bribeOthers',
  [SeverityLevel.FakeSupplier]: 'fakeSupplier',
  [SeverityLevel.Other]: 'other',
  [SeverityLevel.Positive]: 'positive',
  [SeverityLevel.Recommended]: 'recommended',
  [SeverityLevel.HighQuality]: 'highQuality',
  [SeverityLevel.OnTimeDelivery]: 'onTimeDelivery',
  [SeverityLevel.GoodCommunication]: 'goodCommunication',
  [SeverityLevel.Reliable]: 'reliable',
};

/** Slug for a severity, e.g. `SeverityLevel.Delivery` -> `"delivery"`. */
export function severitySlug(severity: SeverityLevel): string {
  return SEVERITY_SLUGS[severity] ?? 'info';
}

/** Translation key for a severity, e.g. `"severity.delivery"`. */
export function severityKey(severity: SeverityLevel): string {
  return 'severity.' + severitySlug(severity);
}
