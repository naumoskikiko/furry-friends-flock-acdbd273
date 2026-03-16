/**
 * Store & Product Ranking Algorithm
 * 
 * Calculates visibility scores based on:
 * - Rating (25%)
 * - Orders (20%)
 * - Engagement (15%)
 * - Product Popularity (15%)
 * - Recency (10%)
 * - Boost (15%)
 * 
 * Boost multipliers:
 * No boost → 1.0
 * 24h → 1.2
 * 3d → 1.35
 * 7d → 1.5
 * 30d → 1.8
 */

export interface StoreRankingInput {
  id: string;
  avg_rating: number;
  total_reviews: number;
  total_orders?: number;
  follower_count?: number;
  product_count?: number;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
}

export interface BoostInfo {
  target_id: string;
  end_date: string;
  duration_hours?: number;
}

// Get boost multiplier based on remaining time / original duration
function getBoostMultiplier(boost: BoostInfo | undefined): number {
  if (!boost) return 1.0;
  const endDate = new Date(boost.end_date);
  if (endDate <= new Date()) return 1.0;

  // Determine multiplier based on total boost duration
  const hours = boost.duration_hours || 0;
  if (hours >= 720) return 1.8;   // 30 days
  if (hours >= 168) return 1.5;   // 7 days
  if (hours >= 72) return 1.35;   // 3 days
  if (hours >= 24) return 1.2;    // 24 hours
  return 1.15;
}

export function calculateStoreScore(
  store: StoreRankingInput,
  boost?: BoostInfo
): number {
  // Rating score (0-1): normalized from 5-star scale
  const ratingScore = Math.min(store.avg_rating / 5, 1);

  // Order score (0-1): normalized, cap at 500
  const orderScore = Math.min((store.total_orders || 0) / 500, 1);

  // Engagement score (0-1): reviews + followers + products as proxy
  const engagementRaw = (store.total_reviews || 0) + (store.follower_count || 0) + (store.product_count || 0);
  const engagementScore = Math.min(engagementRaw / 200, 1);

  // Product popularity (0-1): use reviews as proxy for sales
  const productPopularityScore = Math.min((store.total_reviews || 0) / 100, 1);

  // Recency score (0-1): how recently the store was active (within 30 days)
  const lastActive = new Date(store.updated_at).getTime();
  const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(1 - Math.min(daysSinceActive / 30, 1), 0);

  // Verified bonus
  const verifiedBonus = store.is_verified ? 0.05 : 0;

  // Base score from weighted factors
  const baseScore =
    ratingScore * 0.25 +
    orderScore * 0.20 +
    engagementScore * 0.15 +
    productPopularityScore * 0.15 +
    recencyScore * 0.10 +
    verifiedBonus;

  // Apply boost multiplier (affects the boost weight portion + multiplies overall)
  const boostMultiplier = getBoostMultiplier(boost);
  
  // Add small randomization to prevent stale ordering (0-0.05)
  const randomFactor = Math.random() * 0.05;

  return baseScore * boostMultiplier + randomFactor;
}

// Sort stores by ranking score
export function rankStores<T extends StoreRankingInput>(
  stores: T[],
  boosts: Map<string, BoostInfo>
): T[] {
  return [...stores].sort((a, b) => {
    const scoreA = calculateStoreScore(a, boosts.get(a.id));
    const scoreB = calculateStoreScore(b, boosts.get(b.id));
    return scoreB - scoreA;
  });
}

// Sort products with boost consideration
export interface ProductRankingInput {
  id: string;
  business_id: string;
  price: number;
  created_at: string;
  stock: number | null;
}

export function rankProducts<T extends ProductRankingInput>(
  products: T[],
  productBoosts: Map<string, BoostInfo>,
  storeBoosts: Map<string, BoostInfo>
): T[] {
  return [...products].sort((a, b) => {
    let scoreA = 1.0;
    let scoreB = 1.0;

    // Product-level boost
    const pBoostA = productBoosts.get(a.id);
    const pBoostB = productBoosts.get(b.id);
    if (pBoostA) scoreA *= getBoostMultiplier(pBoostA) * 1.3;
    if (pBoostB) scoreB *= getBoostMultiplier(pBoostB) * 1.3;

    // Store-level boost affects product visibility
    const sBoostA = storeBoosts.get(a.business_id);
    const sBoostB = storeBoosts.get(b.business_id);
    if (sBoostA) scoreA *= getBoostMultiplier(sBoostA) * 0.8;
    if (sBoostB) scoreB *= getBoostMultiplier(sBoostB) * 0.8;

    // Randomization
    scoreA += Math.random() * 0.05;
    scoreB += Math.random() * 0.05;

    return scoreB - scoreA;
  });
}
