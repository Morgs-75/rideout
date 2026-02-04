import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Notification types
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  UPVOTE: 'upvote',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  FRIEND_POST: 'friend_post',
  PATROL_ALERT: 'patrol_alert',
  LIVERIDE_INVITE: 'liveride_invite',
  // Tracking notifications
  TRACK_REQUEST: 'track_request',
  TRACK_APPROVED: 'track_approved',
  TRACK_REJECTED: 'track_rejected',
  TRACK_REVOKED: 'track_revoked'
};

/**
 * Create a notification in Firestore
 * @param {string} userId - The user who will receive the notification
 * @param {string} type - The type of notification
 * @param {object} data - Additional data for the notification
 */
export const createNotification = async (userId, type, data) => {
  // Don't create notification for yourself
  if (data.fromUserId === userId) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Create a like notification
 */
export const notifyLike = async (postOwnerId, fromUser, post) => {
  await createNotification(postOwnerId, NOTIFICATION_TYPES.LIKE, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    postId: post.id,
    postPreview: post.mediaUrl || '',
    message: `${fromUser.streetName} liked your post`
  });
};

/**
 * Create an upvote notification
 */
export const notifyUpvote = async (postOwnerId, fromUser, post) => {
  await createNotification(postOwnerId, NOTIFICATION_TYPES.UPVOTE, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    postId: post.id,
    postPreview: post.mediaUrl || '',
    message: `${fromUser.streetName} upvoted your post`
  });
};

/**
 * Create a comment notification
 */
export const notifyComment = async (postOwnerId, fromUser, post, commentText) => {
  await createNotification(postOwnerId, NOTIFICATION_TYPES.COMMENT, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    postId: post.id,
    postPreview: post.mediaUrl || '',
    message: `${fromUser.streetName} commented: "${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}"`
  });
};

/**
 * Create a follow notification
 */
export const notifyFollow = async (followedUserId, fromUser) => {
  await createNotification(followedUserId, NOTIFICATION_TYPES.FOLLOW, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    message: `${fromUser.streetName} started following you`
  });
};

/**
 * Create a patrol alert notification for nearby users
 * This would typically be called from a backend function
 * For now, we'll handle it client-side for demo purposes
 */
export const notifyPatrolAlert = async (userId, alertType, reporterName, distance) => {
  await createNotification(userId, NOTIFICATION_TYPES.PATROL_ALERT, {
    alertType,
    reporterName,
    distance,
    message: `${alertType} reported ${distance}km away by ${reporterName}`
  });
};

/**
 * Create a LiveRide invite notification
 * Sent to users who are added as viewers to someone's LiveRide
 */
export const notifyLiveRideInvite = async (viewerId, fromUser, rideId) => {
  await createNotification(viewerId, NOTIFICATION_TYPES.LIVERIDE_INVITE, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    rideId,
    message: `${fromUser.streetName} is sharing their LiveRide with you`
  });
};

/**
 * Notify multiple viewers about a LiveRide
 */
export const notifyLiveRideViewers = async (viewerIds, fromUser, rideId) => {
  const promises = viewerIds.map(viewerId =>
    notifyLiveRideInvite(viewerId, fromUser, rideId)
  );
  await Promise.all(promises);
};

/**
 * Create a track request notification
 */
export const notifyTrackRequest = async (targetUserId, fromUser, requestId) => {
  await createNotification(targetUserId, NOTIFICATION_TYPES.TRACK_REQUEST, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    requestId,
    message: `${fromUser.streetName} wants to track your location`
  });
};

/**
 * Create a track approved notification
 */
export const notifyTrackApproved = async (requesterId, fromUser) => {
  await createNotification(requesterId, NOTIFICATION_TYPES.TRACK_APPROVED, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    message: `${fromUser.streetName} approved your tracking request`
  });
};

/**
 * Create a track rejected notification
 */
export const notifyTrackRejected = async (requesterId, fromUser) => {
  await createNotification(requesterId, NOTIFICATION_TYPES.TRACK_REJECTED, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    message: `${fromUser.streetName} declined your tracking request`
  });
};

/**
 * Create a track revoked notification
 */
export const notifyTrackRevoked = async (targetUserId, fromUser) => {
  await createNotification(targetUserId, NOTIFICATION_TYPES.TRACK_REVOKED, {
    fromUserId: fromUser.uid,
    fromUserName: fromUser.streetName,
    fromUserAvatar: fromUser.avatar || '',
    message: `${fromUser.streetName} stopped tracking`
  });
};
