// LiveRide Service - Core business logic for real-time ride tracking
//
// FIRESTORE INDEXES REQUIRED:
// Collection: liveRides
// 1. status ASC, allowedViewers ARRAY_CONTAINS
// 2. status ASC, uid ASC
//
// To create these indexes, either:
// - Run the app and click the error link in console, OR
// - Go to Firebase Console > Firestore > Indexes > Add Index

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
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Geohash encoding for spatial queries (simplified 6-char precision ~1.2km)
const encodeGeohash = (lat, lng) => {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let hash = '';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < 6) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
};

// Calculate distance between two points in km (Haversine formula)
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Calculate total distance from path points
// pathPoints format: [{lng, lat, time}, ...]
export const calculateTotalDistance = (pathPoints) => {
  if (!pathPoints || pathPoints.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];
    total += calculateDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  return total;
};

// Start a new live ride
// isPublic: true = anyone can view
// followersOnly: true = all followers can view (checked dynamically)
export const startLiveRide = async (uid, profile, lat, lng, allowedViewers = [], isPublic = false, followersOnly = false) => {
  const now = Timestamp.now();
  const epochSeconds = Math.floor(Date.now() / 1000);

  const rideData = {
    uid,
    streetName: profile.streetName || 'Rider',
    streetNameDisplay: profile.streetName || 'Rider',
    avatarUrl: profile.avatar || null,

    // Status
    status: 'active',
    startedAt: now,
    endedAt: null,

    // Current position
    currentLat: lat,
    currentLng: lng,
    geohash: encodeGeohash(lat, lng),
    updatedAt: now,

    // Start point
    startLat: lat,
    startLng: lng,

    // Path data - array of {lng, lat, time} objects (Firestore doesn't support nested arrays)
    pathPoints: [{ lng, lat, time: epochSeconds }],

    // Viewer permissions
    allowedViewers: allowedViewers,
    isPublic: isPublic,  // If true, anyone can view this ride
    followersOnly: followersOnly,  // If true, all followers can view

    // Stats
    totalDistanceKm: 0,
    durationMinutes: 0
  };

  const docRef = await addDoc(collection(db, 'liveRides'), rideData);
  return { id: docRef.id, ...rideData };
};

// Update ride position (append path point)
export const updateLiveRidePosition = async (rideId, lat, lng) => {
  const epochSeconds = Math.floor(Date.now() / 1000);
  const rideRef = doc(db, 'liveRides', rideId);

  // Get current ride data to calculate distance
  const rideSnap = await getDoc(rideRef);
  if (!rideSnap.exists()) {
    throw new Error('Ride not found');
  }

  const rideData = rideSnap.data();
  const newPoint = { lng, lat, time: epochSeconds };

  // Calculate new total distance
  const newPathPoints = [...(rideData.pathPoints || []), newPoint];
  const totalDistanceKm = calculateTotalDistance(newPathPoints);

  // Calculate duration in minutes
  const startTime = rideData.startedAt?.toDate?.() || new Date();
  const durationMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);

  await updateDoc(rideRef, {
    currentLat: lat,
    currentLng: lng,
    geohash: encodeGeohash(lat, lng),
    updatedAt: serverTimestamp(),
    pathPoints: arrayUnion(newPoint),
    totalDistanceKm,
    durationMinutes
  });

  return { totalDistanceKm, durationMinutes };
};

// Add a viewer to the ride
export const addViewer = async (rideId, viewerUid) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    allowedViewers: arrayUnion(viewerUid)
  });
};

// Remove a viewer from the ride
export const removeViewer = async (rideId, viewerUid) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    allowedViewers: arrayRemove(viewerUid)
  });
};

// Add multiple viewers at once
export const setViewers = async (rideId, viewerUids) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    allowedViewers: viewerUids
  });
};

// Toggle public visibility
export const setRidePublic = async (rideId, isPublic) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    isPublic: isPublic
  });
};

// Pause the ride
export const pauseLiveRide = async (rideId) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    status: 'paused',
    updatedAt: serverTimestamp()
  });
};

// Resume the ride
export const resumeLiveRide = async (rideId) => {
  const rideRef = doc(db, 'liveRides', rideId);
  await updateDoc(rideRef, {
    status: 'active',
    updatedAt: serverTimestamp()
  });
};

// End the ride
export const endLiveRide = async (rideId) => {
  const rideRef = doc(db, 'liveRides', rideId);

  // Get final stats
  const rideSnap = await getDoc(rideRef);
  if (!rideSnap.exists()) {
    throw new Error('Ride not found');
  }

  const rideData = rideSnap.data();
  const startTime = rideData.startedAt?.toDate?.() || new Date();
  const durationMinutes = Math.floor((Date.now() - startTime.getTime()) / 60000);

  await updateDoc(rideRef, {
    status: 'completed',
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    durationMinutes
  });

  return { durationMinutes, totalDistanceKm: rideData.totalDistanceKm };
};

// Get user's active ride
export const getMyActiveRide = async (uid) => {
  const ridesRef = collection(db, 'liveRides');
  const q = query(
    ridesRef,
    where('uid', '==', uid),
    where('status', 'in', ['active', 'paused'])
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Get all rides the user can view (where they are in allowedViewers)
export const getViewableLiveRides = async (viewerUid) => {
  const ridesRef = collection(db, 'liveRides');
  const q = query(
    ridesRef,
    where('status', '==', 'active'),
    where('allowedViewers', 'array-contains', viewerUid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Subscribe to a specific ride (real-time listener)
export const subscribeToLiveRide = (rideId, callback) => {
  const rideRef = doc(db, 'liveRides', rideId);
  return onSnapshot(rideRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to ride:', error);
    callback(null);
  });
};

// Subscribe to all viewable rides (real-time listener)
// Includes: rides where user is in allowedViewers + public rides + followers-only rides (if user follows rider)
export const subscribeToViewableLiveRides = (viewerUid, callback, followingIds = []) => {
  const ridesRef = collection(db, 'liveRides');

  // Query for rides where user is explicitly allowed
  const allowedQuery = query(
    ridesRef,
    where('status', '==', 'active'),
    where('allowedViewers', 'array-contains', viewerUid)
  );

  // Query for public rides
  const publicQuery = query(
    ridesRef,
    where('status', '==', 'active'),
    where('isPublic', '==', true)
  );

  // Query for followers-only rides
  const followersOnlyQuery = query(
    ridesRef,
    where('status', '==', 'active'),
    where('followersOnly', '==', true)
  );

  let allowedRides = [];
  let publicRides = [];
  let followersOnlyRides = [];

  const mergeAndCallback = () => {
    // Merge and deduplicate by ride id
    const allRides = [...allowedRides];
    publicRides.forEach(ride => {
      if (!allRides.find(r => r.id === ride.id)) {
        allRides.push(ride);
      }
    });
    // Only include followers-only rides if user follows the rider
    followersOnlyRides.forEach(ride => {
      if (!allRides.find(r => r.id === ride.id) && followingIds.includes(ride.uid)) {
        allRides.push(ride);
      }
    });
    callback(allRides);
  };

  // Subscribe to allowed rides
  const unsubAllowed = onSnapshot(allowedQuery, (snapshot) => {
    allowedRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    mergeAndCallback();
  }, (error) => {
    console.error('Error subscribing to allowed rides:', error);
  });

  // Subscribe to public rides
  const unsubPublic = onSnapshot(publicQuery, (snapshot) => {
    publicRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    mergeAndCallback();
  }, (error) => {
    console.error('Error subscribing to public rides:', error);
  });

  // Subscribe to followers-only rides
  const unsubFollowersOnly = onSnapshot(followersOnlyQuery, (snapshot) => {
    followersOnlyRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    mergeAndCallback();
  }, (error) => {
    console.error('Error subscribing to followers-only rides:', error);
  });

  // Return combined unsubscribe function
  return () => {
    unsubAllowed();
    unsubPublic();
    unsubFollowersOnly();
  };
};

// Subscribe to user's own active ride
export const subscribeToMyActiveRide = (uid, callback) => {
  const ridesRef = collection(db, 'liveRides');
  const q = query(
    ridesRef,
    where('uid', '==', uid),
    where('status', 'in', ['active', 'paused'])
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, ...doc.data() });
    }
  }, (error) => {
    console.error('Error subscribing to my ride:', error);
    callback(null);
  });
};

// Delete a ride (for cleanup)
export const deleteLiveRide = async (rideId) => {
  await deleteDoc(doc(db, 'liveRides', rideId));
};

// Format duration for display (e.g., "1h 23m" or "45m")
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format distance for display (e.g., "12.5 km" or "500 m")
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};
