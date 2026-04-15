/**
 * Haversine distance between two lat/lng points in kilometers.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Check if a business can deliver to the user's location.
 * Returns distance in km or null if coordinates are missing.
 */
export function getDeliveryDistance(
  userLat: number | null | undefined,
  userLng: number | null | undefined,
  bizLat: number | null | undefined,
  bizLng: number | null | undefined
): number | null {
  if (
    userLat == null || userLng == null ||
    bizLat == null || bizLng == null
  ) return null;
  return haversineDistance(userLat, userLng, bizLat, bizLng);
}

/**
 * Returns true if the business can deliver to the user.
 * If business has no coordinates or no radius set, it's always visible (no filtering).
 */
export function canDeliver(
  userLat: number | null | undefined,
  userLng: number | null | undefined,
  bizLat: number | null | undefined,
  bizLng: number | null | undefined,
  deliveryRadiusKm: number | null | undefined
): boolean {
  // If business has no location or no delivery radius, show it (pickup-only or unrestricted)
  if (bizLat == null || bizLng == null || !deliveryRadiusKm) return true;
  // If user has no location, show all businesses (fallback)
  if (userLat == null || userLng == null) return true;
  const dist = haversineDistance(userLat, userLng, bizLat, bizLng);
  return dist <= deliveryRadiusKm;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
