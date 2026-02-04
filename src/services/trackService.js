// TrackService - Real-time rider tracking with approval workflow
//
// FIRESTORE INDEXES REQUIRED:
// Collection: trackRequests
// 1. toUserId ASC, status ASC
// 2. fromUserId ASC, status ASC
//
// Collection: activeTracks
// 1. trackerId ASC, isActive ASC
// 2. trackedId ASC, isActive ASC
//
// To create indexes: Run the app and click the error link in console

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
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { hasBlockRelationship } from './blockService';
import { createNotification, NOTIFICATION_TYPES } from '../utils/notifications';

// ==================== TRACK REQUESTS ====================

// Send a track request to another rider
export const sendTrackRequest = async (fromUser, toUserId, toUserProfile) => {
  // Prevent self-tracking
  if (fromUser.uid === toUserId) {
    throw new Error('Cannot track yourself');
  }

  // Check for block relationship
  const isBlocked = await hasBlockRelationship(fromUser.uid, toUserId);
  if (isBlocked) {
    throw new Error('Cannot send track request to this user');
  }

  // Check for existing pending request
  const existingRequest = await getPendingRequestBetween(fromUser.uid, toUserId);
  if (existingRequest) {
    throw new Error('Track request already pending');
  }

  // Check if already tracking
  const existingTrack = await getActiveTrackBetween(fromUser.uid, toUserId);
  if (existingTrack) {
    throw new Error('Already tracking this rider');
  }

  // Create request with 24h expiry
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const requestData = {
    fromUserId: fromUser.uid,
    toUserId: toUserId,
    fromStreetName: fromUser.streetName || 'Rider',
    fromAvatarUrl: fromUser.avatar || null,
    toStreetName: toUserProfile?.streetName || 'Rider',
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
    expiresAt
  };

  const docRef = await addDoc(collection(db, 'trackRequests'), requestData);

  // Send notification
  await createNotification(toUserId, NOTIFICATION_TYPES.TRACK_REQUEST, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    requestId: docRef.id,
    message: `${fromUser.streetName} wants to track your location`
  });

  return { id: docRef.id, ...requestData };
};

// Cancel a pending track request
export const cancelTrackRequest = async (requestId) => {
  await deleteDoc(doc(db, 'trackRequests', requestId));
};

// Approve a track request
export const approveTrackRequest = async (requestId) => {
  const requestRef = doc(db, 'trackRequests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const request = requestSnap.data();

  // Create active track
  const trackId = `${request.fromUserId}_${request.toUserId}`;
  const trackData = {
    trackerId: request.fromUserId,
    trackedId: request.toUserId,
    trackerStreetName: request.fromStreetName,
    trackedStreetName: request.toStreetName,
    trackerAvatarUrl: request.fromAvatarUrl,
    startedAt: serverTimestamp(),
    isActive: true,
    isMutual: false
  };

  // Check if mutual tracking exists (they're tracking us)
  const reverseTrack = await getActiveTrackBetween(request.toUserId, request.fromUserId);
  if (reverseTrack) {
    trackData.isMutual = true;
    // Update the reverse track to be mutual
    await updateDoc(doc(db, 'activeTracks', reverseTrack.id), { isMutual: true });
  }

  await updateDoc(doc(db, 'activeTracks', trackId), trackData).catch(async () => {
    // Doc doesn't exist, create it
    await addDoc(collection(db, 'activeTracks'), { ...trackData, id: trackId });
  });

  // Update request status
  await updateDoc(requestRef, {
    status: 'approved',
    respondedAt: serverTimestamp()
  });

  // Notify requester
  await createNotification(request.fromUserId, NOTIFICATION_TYPES.TRACK_APPROVED, {
    fromUserId: request.toUserId,
    fromUserName: request.toStreetName,
    fromUserAvatar: '',
    message: `${request.toStreetName} approved your tracking request`
  });

  return { trackId, ...trackData };
};

// Reject a track request
export const rejectTrackRequest = async (requestId) => {
  const requestRef = doc(db, 'trackRequests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const request = requestSnap.data();

  await updateDoc(requestRef, {
    status: 'rejected',
    respondedAt: serverTimestamp()
  });

  // Notify requester
  await createNotification(request.fromUserId, NOTIFICATION_TYPES.TRACK_REJECTED, {
    fromUserId: request.toUserId,
    fromUserName: request.toStreetName,
    fromUserAvatar: '',
    message: `${request.toStreetName} declined your tracking request`
  });
};

// Get pending request between two users
export const getPendingRequestBetween = async (fromUserId, toUserId) => {
  const q = query(
    collection(db, 'trackRequests'),
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

// Get all pending requests for a user (incoming)
export const getPendingRequestsForUser = async (userId) => {
  const q = query(
    collection(db, 'trackRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all pending requests sent by user (outgoing)
export const getSentPendingRequests = async (userId) => {
  const q = query(
    collection(db, 'trackRequests'),
    where('fromUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Subscribe to pending requests (real-time)
export const subscribeToPendingRequests = (userId, callback) => {
  const q = query(
    collection(db, 'trackRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(requests);
  }, (error) => {
    console.error('Error subscribing to track requests:', error);
  });
};

// ==================== ACTIVE TRACKS ====================

// Get active track between two users
export const getActiveTrackBetween = async (trackerId, trackedId) => {
  const q = query(
    collection(db, 'activeTracks'),
    where('trackerId', '==', trackerId),
    where('trackedId', '==', trackedId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

// Get all riders the user is tracking
export const getActiveTracksAsTracker = async (userId) => {
  const q = query(
    collection(db, 'activeTracks'),
    where('trackerId', '==', userId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all riders tracking the user
export const getActiveTracksAsTracked = async (userId) => {
  const q = query(
    collection(db, 'activeTracks'),
    where('trackedId', '==', userId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Stop tracking someone (as tracker)
export const revokeTracking = async (trackId, currentUser) => {
  const trackRef = doc(db, 'activeTracks', trackId);
  const trackSnap = await getDoc(trackRef);

  if (!trackSnap.exists()) return;

  const track = trackSnap.data();

  // Deactivate the track
  await updateDoc(trackRef, { isActive: false });

  // If mutual, update the reverse track
  if (track.isMutual) {
    const reverseTrack = await getActiveTrackBetween(track.trackedId, track.trackerId);
    if (reverseTrack) {
      await updateDoc(doc(db, 'activeTracks', reverseTrack.id), { isMutual: false });
    }
  }

  // Remove tracker location
  await removeTrackerLocation(track.trackerId);

  // Notify the tracked person
  await createNotification(track.trackedId, NOTIFICATION_TYPES.TRACK_REVOKED, {
    fromUserId: currentUser.uid,
    fromUserName: currentUser.streetName,
    fromUserAvatar: currentUser.avatar || '',
    message: `${currentUser.streetName} stopped tracking you`
  });
};

// Remove someone tracking you (as tracked)
export const removeTracker = async (trackId, currentUser) => {
  const trackRef = doc(db, 'activeTracks', trackId);
  const trackSnap = await getDoc(trackRef);

  if (!trackSnap.exists()) return;

  const track = trackSnap.data();

  // Deactivate the track
  await updateDoc(trackRef, { isActive: false });

  // If mutual, update the reverse track
  if (track.isMutual) {
    const reverseTrack = await getActiveTrackBetween(track.trackedId, track.trackerId);
    if (reverseTrack) {
      await updateDoc(doc(db, 'activeTracks', reverseTrack.id), { isMutual: false });
    }
  }

  // Remove tracker location
  await removeTrackerLocation(track.trackedId);

  // Notify the tracker
  await createNotification(track.trackerId, NOTIFICATION_TYPES.TRACK_REVOKED, {
    fromUserId: currentUser.uid,
    fromUserName: currentUser.streetName,
    fromUserAvatar: currentUser.avatar || '',
    message: `${currentUser.streetName} removed you from tracking`
  });
};

// Subscribe to tracks where user is tracker (real-time)
export const subscribeToTracksAsTracker = (userId, callback) => {
  const q = query(
    collection(db, 'activeTracks'),
    where('trackerId', '==', userId),
    where('isActive', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tracks);
  }, (error) => {
    console.error('Error subscribing to tracks:', error);
  });
};

// Subscribe to tracks where user is being tracked (real-time)
export const subscribeToTracksAsTracked = (userId, callback) => {
  const q = query(
    collection(db, 'activeTracks'),
    where('trackedId', '==', userId),
    where('isActive', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tracks);
  }, (error) => {
    console.error('Error subscribing to trackers:', error);
  });
};

// ==================== TRACKER LOCATIONS ====================

// Update user's tracker location
export const updateTrackerLocation = async (userId, streetName, avatarUrl, lat, lng, heading = 0, speed = 0) => {
  const locationRef = doc(db, 'trackerLocations', userId);

  const locationData = {
    userId,
    streetName,
    avatarUrl: avatarUrl || null,
    location: new GeoPoint(lat, lng),
    heading,
    speed,
    lastUpdated: serverTimestamp(),
    isOnline: true
  };

  await updateDoc(locationRef, locationData).catch(async () => {
    // Document doesn't exist, use setDoc equivalent
    const { setDoc } = await import('firebase/firestore');
    await setDoc(locationRef, locationData);
  });

  return locationData;
};

// Remove tracker location (when stopping tracking)
export const removeTrackerLocation = async (userId) => {
  try {
    await deleteDoc(doc(db, 'trackerLocations', userId));
  } catch (error) {
    // Location may not exist
  }
};

// Set online status
export const setTrackerOnlineStatus = async (userId, isOnline) => {
  const locationRef = doc(db, 'trackerLocations', userId);
  try {
    await updateDoc(locationRef, {
      isOnline,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    // Location may not exist
  }
};

// Subscribe to locations of tracked riders
export const subscribeToTrackedLocations = (trackedUserIds, callback) => {
  if (!trackedUserIds || trackedUserIds.length === 0) {
    callback([]);
    return () => {};
  }

  // Firestore 'in' queries limited to 10 items
  const chunks = [];
  for (let i = 0; i < trackedUserIds.length; i += 10) {
    chunks.push(trackedUserIds.slice(i, i + 10));
  }

  const unsubscribes = [];
  const allLocations = new Map();

  chunks.forEach((chunk, chunkIndex) => {
    const q = query(
      collection(db, 'trackerLocations'),
      where('userId', 'in', chunk)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(doc => {
        allLocations.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Callback with all locations
      callback(Array.from(allLocations.values()));
    }, (error) => {
      console.error('Error subscribing to tracker locations:', error);
    });

    unsubscribes.push(unsub);
  });

  return () => unsubscribes.forEach(unsub => unsub());
};

// Get single tracker location
export const getTrackerLocation = async (userId) => {
  const locationRef = doc(db, 'trackerLocations', userId);
  const snap = await getDoc(locationRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ==================== UTILITIES ====================

// Calculate distance between two GeoPoints in km
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

// Format distance for display
export const formatTrackDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

// Clean up expired pending requests (call periodically or via cloud function)
export const cleanupExpiredRequests = async () => {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'trackRequests'),
    where('status', '==', 'pending'),
    where('expiresAt', '<', now)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  return snapshot.size;
};
