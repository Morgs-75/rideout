import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Block a user
export async function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  // Check if already blocked
  const existingBlock = await getBlockRecord(blockerId, blockedId);
  if (existingBlock) {
    return existingBlock;
  }

  const blockData = {
    blockerId,
    blockedId,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'blocks'), blockData);
  return { id: docRef.id, ...blockData };
}

// Unblock a user
export async function unblockUser(blockerId, blockedId) {
  const blockRecord = await getBlockRecord(blockerId, blockedId);
  if (blockRecord) {
    await deleteDoc(doc(db, 'blocks', blockRecord.id));
    return true;
  }
  return false;
}

// Get block record between two users
export async function getBlockRecord(blockerId, blockedId) {
  const q = query(
    collection(db, 'blocks'),
    where('blockerId', '==', blockerId),
    where('blockedId', '==', blockedId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

// Check if user A has blocked user B
export async function isUserBlocked(blockerId, blockedId) {
  const record = await getBlockRecord(blockerId, blockedId);
  return !!record;
}

// Check if either user has blocked the other
export async function hasBlockRelationship(userId1, userId2) {
  const [blocked1, blocked2] = await Promise.all([
    isUserBlocked(userId1, userId2),
    isUserBlocked(userId2, userId1)
  ]);
  return blocked1 || blocked2;
}

// Get all users blocked by a specific user
export async function getBlockedUsers(blockerId) {
  const q = query(
    collection(db, 'blocks'),
    where('blockerId', '==', blockerId)
  );
  const snapshot = await getDocs(q);

  const blockedUsers = [];
  for (const blockDoc of snapshot.docs) {
    const blockedId = blockDoc.data().blockedId;
    const userDoc = await getDoc(doc(db, 'users', blockedId));
    if (userDoc.exists()) {
      blockedUsers.push({
        blockId: blockDoc.id,
        blockedAt: blockDoc.data().createdAt,
        user: { id: userDoc.id, ...userDoc.data() }
      });
    }
  }

  return blockedUsers;
}

// Get IDs of all users blocked by a specific user (for filtering)
export async function getBlockedUserIds(blockerId) {
  const q = query(
    collection(db, 'blocks'),
    where('blockerId', '==', blockerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().blockedId);
}

// Get IDs of users who have blocked a specific user (for filtering)
export async function getUsersWhoBlocked(blockedId) {
  const q = query(
    collection(db, 'blocks'),
    where('blockedId', '==', blockedId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().blockerId);
}
