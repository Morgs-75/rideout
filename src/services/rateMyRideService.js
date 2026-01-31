// RateMyRide Service - Post and rate bike setups
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// Rating categories
export const RATING_CATEGORIES = {
  style: { label: 'Style', emoji: '🔥', description: 'Overall look and aesthetics' },
  mods: { label: 'Mods', emoji: '⚡', description: 'Modifications and upgrades' },
  clean: { label: 'Clean', emoji: '✨', description: 'Cleanliness and maintenance' },
  power: { label: 'Power', emoji: '💪', description: 'Performance and speed' }
};

// Post a new bike
export const postBike = async (uid, profile, imageFile, caption, bikeName) => {
  // Upload image to storage
  const imageRef = ref(storage, `ratemyride/${uid}/${Date.now()}_${imageFile.name}`);
  await uploadBytes(imageRef, imageFile);
  const imageUrl = await getDownloadURL(imageRef);

  const bikeData = {
    uid,
    streetName: profile.streetName || 'Rider',
    avatarUrl: profile.avatar || null,

    // Bike details
    imageUrl,
    caption: caption || '',
    bikeName: bikeName || profile.bike || 'My Ride',

    // Rating aggregates (will be updated when ratings come in)
    ratings: {
      style: { total: 0, count: 0, avg: 0 },
      mods: { total: 0, count: 0, avg: 0 },
      clean: { total: 0, count: 0, avg: 0 },
      power: { total: 0, count: 0, avg: 0 }
    },
    overallRating: 0,
    totalRatings: 0,

    // Engagement
    viewCount: 0,

    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'rateMyRide'), bikeData);
  return { id: docRef.id, ...bikeData };
};

// Rate a bike
export const rateBike = async (bikeId, raterId, ratings) => {
  // ratings = { style: 1-5, mods: 1-5, clean: 1-5, power: 1-5 }

  // Check if user already rated this bike
  const existingRating = await getUserRating(bikeId, raterId);

  const ratingData = {
    bikeId,
    raterId,
    ratings,
    createdAt: serverTimestamp()
  };

  if (existingRating) {
    // Update existing rating
    await updateDoc(doc(db, 'bikeRatings', existingRating.id), {
      ratings,
      updatedAt: serverTimestamp()
    });
  } else {
    // Create new rating
    await addDoc(collection(db, 'bikeRatings'), ratingData);
  }

  // Recalculate bike's aggregate ratings
  await recalculateBikeRatings(bikeId);
};

// Get user's rating for a specific bike
export const getUserRating = async (bikeId, raterId) => {
  const q = query(
    collection(db, 'bikeRatings'),
    where('bikeId', '==', bikeId),
    where('raterId', '==', raterId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

// Recalculate aggregate ratings for a bike
const recalculateBikeRatings = async (bikeId) => {
  const ratingsQuery = query(
    collection(db, 'bikeRatings'),
    where('bikeId', '==', bikeId)
  );
  const snapshot = await getDocs(ratingsQuery);

  const aggregates = {
    style: { total: 0, count: 0 },
    mods: { total: 0, count: 0 },
    clean: { total: 0, count: 0 },
    power: { total: 0, count: 0 }
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    Object.keys(aggregates).forEach(cat => {
      if (data.ratings[cat]) {
        aggregates[cat].total += data.ratings[cat];
        aggregates[cat].count += 1;
      }
    });
  });

  // Calculate averages
  const ratings = {};
  let overallTotal = 0;
  let overallCount = 0;

  Object.keys(aggregates).forEach(cat => {
    const avg = aggregates[cat].count > 0
      ? aggregates[cat].total / aggregates[cat].count
      : 0;
    ratings[cat] = {
      total: aggregates[cat].total,
      count: aggregates[cat].count,
      avg: Math.round(avg * 10) / 10
    };
    overallTotal += avg;
    overallCount += 1;
  });

  const overallRating = overallCount > 0
    ? Math.round((overallTotal / overallCount) * 10) / 10
    : 0;

  await updateDoc(doc(db, 'rateMyRide', bikeId), {
    ratings,
    overallRating,
    totalRatings: snapshot.size,
    updatedAt: serverTimestamp()
  });
};

// Get bikes feed (paginated)
export const getBikes = async (lastDoc = null, pageSize = 10, sortBy = 'newest') => {
  let q;

  if (sortBy === 'topRated') {
    q = query(
      collection(db, 'rateMyRide'),
      orderBy('overallRating', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  } else {
    q = query(
      collection(db, 'rateMyRide'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const bikes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { bikes, lastDoc: lastVisible };
};

// Get user's bikes
export const getUserBikes = async (uid) => {
  const q = query(
    collection(db, 'rateMyRide'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get single bike
export const getBike = async (bikeId) => {
  const docSnap = await getDoc(doc(db, 'rateMyRide', bikeId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
};

// Delete a bike post
export const deleteBike = async (bikeId) => {
  // Delete all ratings for this bike
  const ratingsQuery = query(
    collection(db, 'bikeRatings'),
    where('bikeId', '==', bikeId)
  );
  const ratingsSnapshot = await getDocs(ratingsQuery);
  const deletePromises = ratingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete the bike post
  await deleteDoc(doc(db, 'rateMyRide', bikeId));
};

// Increment view count
export const incrementViewCount = async (bikeId) => {
  await updateDoc(doc(db, 'rateMyRide', bikeId), {
    viewCount: increment(1)
  });
};

// Get top rated bikes (leaderboard)
export const getTopRatedBikes = async (limitCount = 10) => {
  const q = query(
    collection(db, 'rateMyRide'),
    where('totalRatings', '>=', 3), // Minimum ratings to qualify
    orderBy('totalRatings'),
    orderBy('overallRating', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Subscribe to bikes feed (real-time)
export const subscribeToBikes = (callback, sortBy = 'newest') => {
  let q;

  if (sortBy === 'topRated') {
    q = query(
      collection(db, 'rateMyRide'),
      orderBy('overallRating', 'desc'),
      limit(20)
    );
  } else {
    q = query(
      collection(db, 'rateMyRide'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }

  return onSnapshot(q, (snapshot) => {
    const bikes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(bikes);
  }, (error) => {
    console.error('Error subscribing to bikes:', error);
    callback([]);
  });
};
