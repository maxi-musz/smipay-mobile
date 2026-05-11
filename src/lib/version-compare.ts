/**
 * Minimal Major.Minor.Patch comparator — sufficient for app-version gating
 * without pulling in the full `semver` dependency.
 *
 * Behaviour:
 *   - Reads the first three numeric segments of each version string.
 *   - Pre-release / build suffixes (`"1.2.0-rc.1"`, `"1.2.0+abc"`) are stripped.
 *   - Missing segments default to `0`, so `"1"` compares equal to `"1.0.0"`.
 *   - Non-numeric noise (`"v1.2.0"`, `" 1.2.0 "`) is tolerated.
 *
 * @returns negative if `a < b`, `0` if equal, positive if `a > b`.
 */
export function compareVersions(a: string, b: string): number {
  const segments = (raw: string): number[] => {
    const cleaned = raw.trim().replace(/^v/i, "").split(/[-+]/)[0];
    const parts = cleaned.split(".");
    return [0, 1, 2].map((i) => {
      const n = Number.parseInt(parts[i] ?? "0", 10);
      return Number.isFinite(n) ? n : 0;
    });
  };

  const pa = segments(a);
  const pb = segments(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
