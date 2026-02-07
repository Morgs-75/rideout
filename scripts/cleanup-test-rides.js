// Cleanup script to delete test LiveRides from non-registered users
// Run with: node scripts/cleanup-test-rides.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDDSHimICCT0hI3eZVthIO9gygVqs-3HCM",
  authDomain: "rideout-c136a.firebaseapp.com",
  projectId: "rideout-c136a",
  storageBucket: "rideout-c136a.firebasestorage.app",
  messagingSenderId: "460917288536",
  appId: "1:460917288536:web:c0020005f18bf2a766242d",
  measurementId: "G-VXKPB48EM4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupTestRides() {
  console.log('Fetching all liveRides...');

  // Get all liveRides
  const ridesSnapshot = await getDocs(collection(db, 'liveRides'));
  console.log(`Found ${ridesSnapshot.size} liveRides`);

  // Get all registered users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const registeredUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
  console.log(`Found ${registeredUserIds.size} registered users`);

  // Find rides from non-registered users
  const ridesToDelete = [];

  ridesSnapshot.forEach(rideDoc => {
    const ride = rideDoc.data();
    const rideId = rideDoc.id;
    const riderUid = ride.uid;

    console.log(`\nRide ${rideId}:`);
    console.log(`  Rider UID: ${riderUid}`);
    console.log(`  Street Name: ${ride.streetName || 'Unknown'}`);
    console.log(`  Status: ${ride.status}`);
    console.log(`  Is Registered: ${registeredUserIds.has(riderUid)}`);

    if (!registeredUserIds.has(riderUid)) {
      ridesToDelete.push({ id: rideId, streetName: ride.streetName, uid: riderUid });
    }
  });

  console.log('\n=================================');
  console.log(`Rides from non-registered users: ${ridesToDelete.length}`);

  if (ridesToDelete.length === 0) {
    console.log('No test rides to delete.');
    return;
  }

  console.log('\nRides to delete:');
  ridesToDelete.forEach(ride => {
    console.log(`  - ${ride.id} (${ride.streetName}, uid: ${ride.uid})`);
  });

  // Delete the rides
  console.log('\nDeleting rides...');
  for (const ride of ridesToDelete) {
    await deleteDoc(doc(db, 'liveRides', ride.id));
    console.log(`  Deleted: ${ride.id}`);
  }

  console.log('\nCleanup complete!');
}

cleanupTestRides().catch(console.error);
