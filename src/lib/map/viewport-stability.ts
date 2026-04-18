/**
 * Viewport stability helpers for the satellite site map.
 *
 * Background
 * ----------
 * `EstimateContext` persists guided-flow input via a reducer whose `setDeep`
 * implementation does `JSON.parse(JSON.stringify(state))`. That means EVERY
 * `updateField(...)` call clones the entire input tree, producing a fresh
 * `mapWorkspace.siteCoordinates` array reference even when the numeric
 * coordinates are unchanged.
 *
 * The map component was previously watching `siteCoordinates` by reference
 * and calling `flyTo` on every change — so placing a charger (which updates
 * `chargerCountFromMap`) caused the viewport to reset to the geocoded site
 * center, forcing users to zoom back in after every marker placement.
 *
 * The helper below encodes the corrected rule: auto-center ONLY when the
 * numeric lat/lng actually change (i.e. a new address was geocoded), never
 * on identity-only changes caused by unrelated state updates.
 */
export type LngLat = readonly [number, number];

/**
 * Returns true when the viewport should be re-centered (a new geocode
 * happened), false when the incoming coordinates are the same point as the
 * last centered location (identity-only change from an unrelated state
 * update — must NOT trigger a flyTo).
 */
export function shouldRecenterViewport(
  previous: LngLat | null,
  next: LngLat | null,
): boolean {
  if (!next) return false;
  if (!previous) return true;
  return previous[0] !== next[0] || previous[1] !== next[1];
}
