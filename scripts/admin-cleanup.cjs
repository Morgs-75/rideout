// Admin cleanup script using Firebase Admin SDK
// Uses the Firebase CLI credentials

const admin = require('firebase-admin');

// Initialize with application default credentials (uses firebase CLI login)
admin.initializeApp({
  projectId: 'rideout-c136a',
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function cleanupTestRides() {
  console.log('Fetching all liveRides...');

  // Get all liveRides
  const ridesSnapshot = await db.collection('liveRides').get();
  console.log(`Found ${ridesSnapshot.size} liveRides`);

  // Get all registered users
  const usersSnapshot = await db.collection('users').get();
  const registeredUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
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
      isRegistered: registeredUserIds.has(ride.uid)
    };

    allRides.push(rideInfo);
    if (!rideInfo.isRegistered) {
      testRides.push(rideInfo);
    }
  });

  console.log('\n=== All LiveRides ===');
  console.table(allRides);

  console.log('\n=== Test Rides (Non-Registered Users) ===');
  if (testRides.length === 0) {
    console.log('No test rides found from non-registered users.');
  } else {
    console.table(testRides);

    console.log(`\nDeleting ${testRides.length} test rides...`);
    for (const ride of testRides) {
      await db.collection('liveRides').doc(ride.id).delete();
      console.log(`  Deleted: ${ride.id} (${ride.streetName})`);
    }
    console.log('\nCleanup complete!');
  }

  process.exit(0);
}

cleanupTestRides().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
