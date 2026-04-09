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
 * 
 * Products are interleaved so promoted items mix naturally
 * with organic content — no visible "Sponsored" labels.
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
  storeBoosts: Map<string, BoostInfo>,
  engagementMap?: Map<string, { likes: number; saves: number; reviews: number; avgRating: number }>
): T[] {
  const scored = products.map((p) => {
    let score = 0;

    // Engagement score (likes, saves, reviews) — 0 to ~50
    const eng = engagementMap?.get(p.id);
    if (eng) {
      score += Math.min(eng.likes * 2, 15);
      score += Math.min(eng.saves * 3, 15);
      score += Math.min(eng.reviews * 4, 10);
      score += (eng.avgRating / 5) * 10;
    }

    // Recency bonus — newer products get a small boost (0-10)
    const daysSinceCreated = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(10 - Math.min(daysSinceCreated / 7, 10), 0);

    // Stock urgency — low stock items feel more engaging (0-5)
    if (p.stock !== null && p.stock > 0 && p.stock <= 5) {
      score += 5;
    }

    // Product-level boost
    const pBoost = productBoosts.get(p.id);
    if (pBoost) score *= getBoostMultiplier(pBoost) * 1.3;

    // Store-level boost affects product visibility
    const sBoost = storeBoosts.get(p.business_id);
    if (sBoost) score *= getBoostMultiplier(sBoost) * 0.8;

    // Small randomization for natural feel
    score += Math.random() * 3;

    return { product: p, score, isBoosted: !!(pBoost || sBoost) };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Interleave promoted items naturally: max 2 consecutive boosted items
  return interleavePromoted(scored);
}

/**
 * Interleave promoted/boosted items with organic ones.
 * Ensures max 2 boosted items appear consecutively,
 * then at least 2 organic items follow.
 */
function interleavePromoted<T>(
  scored: { product: T; score: number; isBoosted: boolean }[]
): T[] {
  const boosted = scored.filter((s) => s.isBoosted);
  const organic = scored.filter((s) => !s.isBoosted);

  if (boosted.length === 0) return scored.map((s) => s.product);
  if (organic.length === 0) return scored.map((s) => s.product);

  const result: T[] = [];
  let bi = 0;
  let oi = 0;

  while (bi < boosted.length || oi < organic.length) {
    // Insert 1-2 boosted items
    const boostSlot = Math.min(2, boosted.length - bi);
    for (let i = 0; i < boostSlot && bi < boosted.length; i++) {
      result.push(boosted[bi++].product);
    }

    // Insert 2-3 organic items
    const organicSlot = Math.min(3, organic.length - oi);
    for (let i = 0; i < organicSlot && oi < organic.length; i++) {
      result.push(organic[oi++].product);
    }
  }

  return result;
}

/**
 * Interleave stores naturally — same logic as products.
 * Used for the flat "all" list.
 */
export function interleaveStores<T>(
  boosted: T[],
  followed: T[],
  organic: T[]
): T[] {
  const result: T[] = [];
  let bi = 0;
  let fi = 0;
  let oi = 0;

  while (bi < boosted.length || fi < followed.length || oi < organic.length) {
    // 1-2 boosted
    for (let i = 0; i < 2 && bi < boosted.length; i++) {
      result.push(boosted[bi++]);
    }
    // 1-2 followed
    for (let i = 0; i < 2 && fi < followed.length; i++) {
      result.push(followed[fi++]);
    }
    // 2-3 organic
    for (let i = 0; i < 3 && oi < organic.length; i++) {
      result.push(organic[oi++]);
    }
  }

  return result;
}
