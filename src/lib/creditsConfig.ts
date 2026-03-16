// PetKeep Credits Economy Configuration
// 1 PetKeep Credit = 1 MKD

export const CREDIT_REWARDS = {
  create_post: 0.5,
  post_like_received: 0.05,
  post_comment: 0.2,
  create_story: 0.3,
  story_reply: 0.1,
  blog_reply: 0.5,
  helpful_blog_answer: 2.0,
} as const;

export const CREDIT_LIMITS = {
  daily_max: 50,
  monthly_max: 1000,
  min_withdrawal: 3000,
  max_likes_per_post: 100, // Only first 100 likes on a post earn credits
} as const;

export const CREDIT_SPENDING = {
  boost_post: 10,
  boost_story: 5,
  feature_profile: 20,
  store_discount_5pct: 50,
  store_discount_10pct: 90,
  care_discount_5pct: 50,
  care_discount_10pct: 90,
} as const;

export type CreditAction = keyof typeof CREDIT_REWARDS;
export type CreditSpendAction = keyof typeof CREDIT_SPENDING;
