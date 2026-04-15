// PetKeep Credits Economy Configuration
// 1 PetKeep Credit = 1 MKD discount (platform currency only, non-withdrawable)
// Credits can ONLY be spent on marketplace purchases

export const CREDIT_REWARDS = {
  create_post: 2,
  like_given: 0.05,
  post_comment: 0.1,
  create_story: 1,
  blog_reply: 0.1,
  helpful_blog_answer: 0.5,
} as const;

export const CREDIT_LIMITS = {
  daily_max: 20,
  monthly_max: 500,
} as const;

// Minimum seconds between earning the same action type (anti-spam)
export const CREDIT_COOLDOWNS: Record<CreditAction, number> = {
  create_post: 30,
  like_given: 5,
  post_comment: 10,
  create_story: 30,
  blog_reply: 10,
  helpful_blog_answer: 0,
};

export type CreditAction = keyof typeof CREDIT_REWARDS;
