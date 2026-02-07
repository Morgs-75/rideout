// Admin cleanup utility - run from browser console while logged in
// Usage: Import in browser console or call from Settings page

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function findTestRides() {
  console.log('Fetching all liveRides...');

  // Get all liveRides
  const ridesSnapshot = await getDocs(collection(db, 'liveRides'));
  console.log(`Found ${ridesSnapshot.size} liveRides`);

  // Get all registered users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const registeredUserIds = new Set(usersSnapshot.docs.map(d => d.id));
  console.log(`Found ${registeredUserIds.size} registered users`);

  const allRides = [];
  const testRides = [];

  ridesSnapshot.forEach(rideDoc => {
    const ride = rideDoc.data();
    const rideInfo = {
      id: rideDoc.id,
      uid: ride.uid,
      streetName: ride.streetName || 'Unknown',
      status: ride.status,
      isRegistered: registeredUserIds.has(ride.uid),
      startedAt: ride.startedAt?.toDate?.()?.toISOString() || 'Unknown'
    };

    allRides.push(rideInfo);
    if (!rideInfo.isRegistered) {
      testRides.push(rideInfo);
    }
  });

  console.log('\n=== All LiveRides ===');
  console.table(allRides);

  console.log('\n=== Test Rides (Non-Registered Users) ===');
  console.table(testRides);

  return { allRides, testRides };
}

export async function deleteTestRides() {
  const { testRides } = await findTestRides();

  if (testRides.length === 0) {
    console.log('No test rides to delete.');
    return;
  }

  console.log(`\nDeleting ${testRides.length} test rides...`);

  for (const ride of testRides) {
    await deleteDoc(doc(db, 'liveRides', ride.id));
    console.log(`Deleted: ${ride.id} (${ride.streetName})`);
  }

  console.log('\nCleanup complete!');
  return testRides.length;
}

export async function deleteRideById(rideId) {
  await deleteDoc(doc(db, 'liveRides', rideId));
  console.log(`Deleted ride: ${rideId}`);
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.adminCleanup = {
    findTestRides,
    deleteTestRides,
    deleteRideById
  };
}
