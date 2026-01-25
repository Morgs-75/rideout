// RideOut Gamification Configuration
export const GAMIFICATION_CONFIG = {
  schema_version: "1.0.0",
  product: {
    name: "RideOut",
    currency_name: "Points",
    points_symbol: "pts",
    timezone: "Australia/Brisbane"
  },

  // Tier definitions
  tiers: [
    { name: "Rider", min: 0, max: 499, color: "#6B7280", icon: "🏍️" },
    { name: "Core Rider", min: 500, max: 1499, color: "#3B82F6", icon: "⚡" },
    { name: "Crew Leader", min: 1500, max: 4999, color: "#8B5CF6", icon: "🔥" },
    { name: "Road Captain", min: 5000, max: 999999999, color: "#F59E0B", icon: "👑" }
  ],

  // Points rules
  points: {
    // Onboarding
    register: 25,
    complete_profile: 25,
    first_post_24h: 50,

    // Content
    post_created: 20,
    post_created_daily_limit: 5,
    like_received: 2,
    like_received_per_post_max: 40,
    upvote_received: 5,
    upvote_received_per_post_max: 50,
    comment_received: 5,
    comment_received_per_post_max: 50,
    comment_given: 2,
    comment_given_daily_limit: 10,

    // Referrals
    referral_level_1: 100,
    referral_level_2: 40,
    referral_level_3: 15,
    referral_monthly_cap: 1000,

    // Riding
    ride_km_verified: 1,
    ride_km_daily_max: 30,
    group_ride_joined: 20,
    group_ride_daily_max: 3,
    ride_event_created: 50,
    ride_event_weekly_max: 2
  },

  // Anti-spam rules
  antiSpam: {
    pairwise_daily_limit: 20,
    rapid_comments_window_minutes: 10,
    rapid_comments_max: 6,
    new_account_age_hours: 24,
    new_account_reduction_percent: 80
  },

  // Economy
  economy: {
    decay_enabled: true,
    decay_rate_percent: 2,
    decay_period: "monthly"
  },

  // Unlockables
  unlockables: [
    { id: "badge_custom", name: "Custom Badge", cost: 250, type: "cosmetic", icon: "🏅" },
    { id: "local_feed_featured", name: "Featured in Local Feed", cost: 500, type: "visibility", icon: "⭐", duration_days: 7 },
    { id: "create_rides_no_approval", name: "Create Rides Without Approval", cost: 1000, type: "capability", icon: "🎫" },
    { id: "profile_highlight", name: "Profile Highlight + Priority Support", cost: 2500, type: "status", icon: "✨" },
    { id: "founding_rider", name: "Founding Rider Status", cost: 5000, type: "status", icon: "🏆" }
  ],

  // Leaderboards
  leaderboards: [
    { id: "road_legends", name: "Road Legends", scope: "global", metric: "lifetime_points", icon: "🏆" },
    { id: "local_kings", name: "Local Kings", scope: "location", metric: "points_30d", icon: "👑" },
    { id: "crew_builders", name: "Crew Builders", scope: "global", metric: "crew_score", icon: "🤝" },
    { id: "distance_earned", name: "Distance Earned", scope: "global", metric: "weekly_km", icon: "🛣️" }
  ]
};

// Helper functions
export const getTier = (points) => {
  const { tiers } = GAMIFICATION_CONFIG;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].min) {
      return tiers[i];
    }
  }
  return tiers[0];
};

export const getNextTier = (points) => {
  const { tiers } = GAMIFICATION_CONFIG;
  for (const tier of tiers) {
    if (points < tier.min) {
      return tier;
    }
  }
  return null;
};

export const getProgressToNextTier = (points) => {
  const currentTier = getTier(points);
  const nextTier = getNextTier(points);

  if (!nextTier) return 100;

  const tierRange = nextTier.min - currentTier.min;
  const progress = points - currentTier.min;

  return Math.min(100, Math.round((progress / tierRange) * 100));
};

export const formatPoints = (points) => {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
};
