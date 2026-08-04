/**
 * The API's `errors` array is English prose written for API consumers and log readers —
 * putting it on screen verbatim drops an English sentence into an Arabic UI. Refusals the
 * user is expected to act on therefore carry a stable `code` (see `Result.Code` on the
 * backend), and the UI translates that instead. Matching on the English wording would work
 * until the day someone rephrases it.
 */
export function apiErrorCode(err: unknown): string | null {
  const code = (err as { error?: { code?: unknown } })?.error?.code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

/**
 * Translation key for a failed entity deletion. `entityHasReviews` is the one refusal the
 * API raises here, and it covers reviews in every status — an entity showing zero reviews
 * on its profile can still be blocked by submissions sitting in the moderation queue,
 * which is exactly the case the message has to explain.
 */
export function entityDeleteErrorKey(err: unknown): string {
  return apiErrorCode(err) === 'entityHasReviews' ? 'entity.deleteBlocked' : 'entity.deleteFailed';
}
