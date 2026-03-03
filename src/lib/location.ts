import * as Location from "expo-location";

interface CachedCoords {
  latitude: string;
  longitude: string;
  timestamp: number;
}

let _cached: CachedCoords | null = null;

const STALE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns cached GPS coordinates if the user has already granted
 * foreground location permission. Returns null otherwise.
 *
 * This function NEVER triggers a permission dialog.
 * Call `requestLocationPermission()` explicitly from a UI context
 * (e.g. after first sign-in) so the user understands why.
 */
export async function getLocation(): Promise<CachedCoords | null> {
  if (_cached && Date.now() - _cached.timestamp < STALE_MS) {
    return _cached;
  }

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return null;

  return refreshLocation();
}

/**
 * Requests foreground-only location permission.
 *
 * Call this from a UI context AFTER explaining to the user why
 * location is needed (fraud prevention). Never call on cold start.
 *
 * - Uses Balanced accuracy (~100m) — sufficient for fraud detection.
 * - Foreground only — no background tracking.
 * - If denied, the app works normally; the backend falls back
 *   to IP-based city-level geolocation.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return false;

  await refreshLocation();
  return true;
}

/**
 * Refreshes the cached coordinates. Only call when permission
 * has already been granted.
 */
async function refreshLocation(): Promise<CachedCoords | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    _cached = {
      latitude: loc.coords.latitude.toString(),
      longitude: loc.coords.longitude.toString(),
      timestamp: Date.now(),
    };

    return _cached;
  } catch {
    return null;
  }
}
