// Points Service - Handles all gamification logic
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GAMIFICATION_CONFIG, getTier } from '../config/gamification';

const { points: POINTS, antiSpam } = GAMIFICATION_CONFIG;

// Initialize user points document
export const initUserPoints = async (userId) => {
  const pointsRef = doc(db, 'userPoints', userId);
  const existing = await getDoc(pointsRef);

  if (!existing.exists()) {
    await setDoc(pointsRef, {
      totalPoints: 0,
      lifetimePoints: 0,
      weeklyKm: 0,
      points30d: 0,
      crewScore: 0,
      tier: 'Rider',
      createdAt: serverTimestamp(),
      lastDecayAt: serverTimestamp(),
      dailyCounts: {},
      referralChain: [],
      referredBy: null
    });
  }
};

// Get user's points data
export const getUserPoints = async (userId) => {
  const pointsRef = doc(db, 'userPoints', userId);
  const snapshot = await getDoc(pointsRef);

  if (!snapshot.exists()) {
    await initUserPoints(userId);
    return { totalPoints: 0, lifetimePoints: 0, tier: 'Rider' };
  }

  return snapshot.data();
};

// Award points to a user
export const awardPoints = async (userId, amount, reason, metadata = {}) => {
  if (amount <= 0) return { success: false, reason: 'Invalid amount' };

  const pointsRef = doc(db, 'userPoints', userId);
  const userPoints = await getUserPoints(userId);

  // Check daily limits based on reason
  const today = new Date().toISOString().split('T')[0];
  const dailyCounts = userPoints.dailyCounts || {};
  const todayCounts = dailyCounts[today] || {};

  // Apply daily limits
  if (reason === 'post_created') {
    if ((todayCounts.posts || 0) >= POINTS.post_created_daily_limit) {
      return { success: false, reason: 'Daily post limit reached' };
    }
    todayCounts.posts = (todayCounts.posts || 0) + 1;
  }

  if (reason === 'comment_given') {
    if ((todayCounts.comments || 0) >= POINTS.comment_given_daily_limit) {
      return { success: false, reason: 'Daily comment limit reached' };
    }
    todayCounts.comments = (todayCounts.comments || 0) + 1;
  }

  if (reason === 'group_ride_joined') {
    if ((todayCounts.groupRides || 0) >= POINTS.group_ride_daily_max) {
      return { success: false, reason: 'Daily group ride limit reached' };
    }
    todayCounts.groupRides = (todayCounts.groupRides || 0) + 1;
  }

  // Check anti-spam for pairwise actions
  if (reason === 'like_received' || reason === 'upvote_received') {
    const { fromUserId, postId } = metadata;
    if (fromUserId) {
      const pairKey = `${fromUserId}_${userId}`;
      const pairCount = todayCounts[`pair_${pairKey}`] || 0;
      if (pairCount >= antiSpam.pairwise_daily_limit) {
        return { success: false, reason: 'Pairwise limit reached' };
      }
      todayCounts[`pair_${pairKey}`] = pairCount + 1;
    }

    // Check per-post limits
    if (postId) {
      const postKey = `post_${postId}_${reason}`;
      const maxPoints = reason === 'like_received'
        ? POINTS.like_received_per_post_max
        : POINTS.upvote_received_per_post_max;
      const currentPostPoints = todayCounts[postKey] || 0;
      if (currentPostPoints >= maxPoints) {
        return { success: false, reason: 'Per-post points limit reached' };
      }
      todayCounts[postKey] = currentPostPoints + amount;
    }
  }

  // Check new account reduction
  let finalAmount = amount;
  if (metadata.fromUserCreatedAt) {
    const accountAgeHours = (Date.now() - metadata.fromUserCreatedAt) / (1000 * 60 * 60);
    if (accountAgeHours < antiSpam.new_account_age_hours) {
      finalAmount = Math.round(amount * (1 - antiSpam.new_account_reduction_percent / 100));
    }
  }

  // Update user points
  const newTotal = userPoints.totalPoints + finalAmount;
  const newLifetime = userPoints.lifetimePoints + finalAmount;
  const newTier = getTier(newLifetime);

  dailyCounts[today] = todayCounts;

  await updateDoc(pointsRef, {
    totalPoints: newTotal,
    lifetimePoints: newLifetime,
    tier: newTier.name,
    dailyCounts,
    lastUpdated: serverTimestamp()
  });

  // Log transaction
  await addDoc(collection(db, 'pointTransactions'), {
    userId,
    amount: finalAmount,
    reason,
    metadata,
    balanceAfter: newTotal,
    createdAt: serverTimestamp()
  });

  return {
    success: true,
    amount: finalAmount,
    newTotal,
    newTier: newTier.name,
    tierChanged: newTier.name !== userPoints.tier
  };
};

// Award points for registration
export const awardRegistrationPoints = async (userId, referredByCode = null) => {
  await initUserPoints(userId);
  await awardPoints(userId, POINTS.register, 'register');

  // Handle referral chain
  if (referredByCode) {
    const referrerQuery = query(
      collection(db, 'users'),
      where('referralCode', '==', referredByCode)
    );
    const referrerSnap = await getDocs(referrerQuery);

    if (!referrerSnap.empty) {
      const referrerDoc = referrerSnap.docs[0];
      const referrerId = referrerDoc.id;

      // Get referrer's chain
      const referrerPoints = await getUserPoints(referrerId);
      const chain = [referrerId, ...(referrerPoints.referralChain || []).slice(0, 2)];

      // Update new user's referred info
      await updateDoc(doc(db, 'userPoints', userId), {
        referredBy: referrerId,
        referralChain: chain
      });

      // Award points to chain
      const rewards = [POINTS.referral_level_1, POINTS.referral_level_2, POINTS.referral_level_3];
      for (let i = 0; i < chain.length && i < 3; i++) {
        await awardPoints(chain[i], rewards[i], `referral_level_${i + 1}`, {
          referredUserId: userId
        });
      }
    }
  }
};

// Award points for profile completion
export const awardProfileCompletion = async (userId, fields) => {
  const required = ['bike', 'location', 'photo'];
  const hasAll = required.every(f => fields[f]);

  if (hasAll) {
    const userPoints = await getUserPoints(userId);
    if (!userPoints.profileCompleted) {
      await awardPoints(userId, POINTS.complete_profile, 'complete_profile');
      await updateDoc(doc(db, 'userPoints', userId), {
        profileCompleted: true
      });
    }
  }
};

// Award points for first post within 24h
export const awardFirstPost = async (userId) => {
  const pointsRef = doc(db, 'userPoints', userId);
  const userPoints = await getUserPoints(userId);

  if (userPoints.firstPostAwarded) return;

  // Check if within 24h of registration
  const registrationTime = userPoints.createdAt?.toDate?.() || new Date(0);
  const hoursSinceRegistration = (Date.now() - registrationTime.getTime()) / (1000 * 60 * 60);

  if (hoursSinceRegistration <= 24) {
    await awardPoints(userId, POINTS.first_post_24h, 'first_post_24h');
  }

  await updateDoc(pointsRef, { firstPostAwarded: true });
};

// Award points for creating a post
export const awardPostCreated = async (userId) => {
  const userPoints = await getUserPoints(userId);

  // Check if first post
  if (!userPoints.firstPostAwarded) {
    await awardFirstPost(userId);
  }

  return awardPoints(userId, POINTS.post_created, 'post_created');
};

// Award points for receiving a like
export const awardLikeReceived = async (postAuthorId, likerId, postId) => {
  return awardPoints(postAuthorId, POINTS.like_received, 'like_received', {
    fromUserId: likerId,
    postId
  });
};

// Award points for receiving an upvote
export const awardUpvoteReceived = async (postAuthorId, voterId, postId) => {
  return awardPoints(postAuthorId, POINTS.upvote_received, 'upvote_received', {
    fromUserId: voterId,
    postId
  });
};

// Award points for receiving a comment
export const awardCommentReceived = async (postAuthorId, commenterId, postId) => {
  // Commenter must have 100+ points
  const commenterPoints = await getUserPoints(commenterId);
  if (commenterPoints.totalPoints < 100) {
    return { success: false, reason: 'Commenter needs 100+ points' };
  }

  return awardPoints(postAuthorId, POINTS.comment_received, 'comment_received', {
    fromUserId: commenterId,
    postId
  });
};

// Award points for giving a comment
export const awardCommentGiven = async (commenterId) => {
  return awardPoints(commenterId, POINTS.comment_given, 'comment_given');
};

// Award points for verified ride km
export const awardRideKm = async (userId, km) => {
  const userPoints = await getUserPoints(userId);
  const today = new Date().toISOString().split('T')[0];
  const dailyCounts = userPoints.dailyCounts || {};
  const todayCounts = dailyCounts[today] || {};

  const kmToday = todayCounts.rideKm || 0;
  const remainingKm = Math.max(0, POINTS.ride_km_daily_max - kmToday);
  const awardableKm = Math.min(km, remainingKm);

  if (awardableKm <= 0) {
    return { success: false, reason: 'Daily km limit reached' };
  }

  todayCounts.rideKm = kmToday + awardableKm;
  dailyCounts[today] = todayCounts;

  await updateDoc(doc(db, 'userPoints', userId), {
    weeklyKm: increment(awardableKm),
    dailyCounts
  });

  return awardPoints(userId, Math.floor(awardableKm * POINTS.ride_km_verified), 'ride_km_verified', {
    km: awardableKm
  });
};

// Award points for joining group ride
export const awardGroupRideJoined = async (userId, rideId) => {
  return awardPoints(userId, POINTS.group_ride_joined, 'group_ride_joined', {
    rideId
  });
};

// Award points for creating a ride event
export const awardRideEventCreated = async (userId, eventId) => {
  const userPoints = await getUserPoints(userId);
  const weekStart = getWeekStart();
  const weekKey = `week_${weekStart}`;
  const weekCounts = userPoints[weekKey] || {};

  if ((weekCounts.rideEvents || 0) >= POINTS.ride_event_weekly_max) {
    return { success: false, reason: 'Weekly ride event limit reached' };
  }

  weekCounts.rideEvents = (weekCounts.rideEvents || 0) + 1;

  await updateDoc(doc(db, 'userPoints', userId), {
    [weekKey]: weekCounts
  });

  return awardPoints(userId, POINTS.ride_event_created, 'ride_event_created', {
    eventId
  });
};

// Get leaderboard data
export const getLeaderboard = async (type, locationFilter = null, limitCount = 50) => {
  let q;
  const pointsRef = collection(db, 'userPoints');

  switch (type) {
    case 'road_legends':
      q = query(pointsRef, orderBy('lifetimePoints', 'desc'), limit(limitCount));
      break;
    case 'local_kings':
      q = query(pointsRef, orderBy('points30d', 'desc'), limit(limitCount));
      break;
    case 'crew_builders':
      q = query(pointsRef, orderBy('crewScore', 'desc'), limit(limitCount));
      break;
    case 'distance_earned':
      q = query(pointsRef, orderBy('weeklyKm', 'desc'), limit(limitCount));
      break;
    default:
      q = query(pointsRef, orderBy('lifetimePoints', 'desc'), limit(limitCount));
  }

  const snapshot = await getDocs(q);
  const leaderboard = [];

  for (const docSnap of snapshot.docs) {
    const userData = docSnap.data();
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', docSnap.id));
    const profile = userDoc.exists() ? userDoc.data() : {};

    leaderboard.push({
      id: docSnap.id,
      rank: leaderboard.length + 1,
      streetName: profile.streetName || 'Unknown',
      avatar: profile.avatar,
      tier: userData.tier || 'Rider',
      points: userData.lifetimePoints || 0,
      points30d: userData.points30d || 0,
      crewScore: userData.crewScore || 0,
      weeklyKm: userData.weeklyKm || 0
    });
  }

  return leaderboard;
};

// Spend points on unlockable
export const spendPoints = async (userId, unlockableId) => {
  const unlockable = GAMIFICATION_CONFIG.unlockables.find(u => u.id === unlockableId);
  if (!unlockable) {
    return { success: false, reason: 'Invalid unlockable' };
  }

  const userPoints = await getUserPoints(userId);
  if (userPoints.totalPoints < unlockable.cost) {
    return { success: false, reason: 'Insufficient points' };
  }

  // Deduct points
  const newTotal = userPoints.totalPoints - unlockable.cost;
  await updateDoc(doc(db, 'userPoints', userId), {
    totalPoints: newTotal
  });

  // Record unlock
  await addDoc(collection(db, 'userUnlocks'), {
    userId,
    unlockableId,
    cost: unlockable.cost,
    unlockedAt: serverTimestamp(),
    expiresAt: unlockable.duration_days
      ? Timestamp.fromDate(new Date(Date.now() + unlockable.duration_days * 24 * 60 * 60 * 1000))
      : null
  });

  // Log transaction
  await addDoc(collection(db, 'pointTransactions'), {
    userId,
    amount: -unlockable.cost,
    reason: `unlock_${unlockableId}`,
    balanceAfter: newTotal,
    createdAt: serverTimestamp()
  });

  return { success: true, newTotal };
};

// Helper: Get week start date
const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
};
