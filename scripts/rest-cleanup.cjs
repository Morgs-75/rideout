// Cleanup script using Firestore REST API
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Firebase project info
const PROJECT_ID = 'rideout-c136a';

// Try to get access token from Firebase CLI config
function getStoredAccessToken() {
  // On Windows with Git Bash, HOME is set to the user's home directory
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const winConfigPath = path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json');

  // Try both paths
  let configFile = configPath;
  if (!fs.existsSync(configFile)) {
    configFile = winConfigPath;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    if (config.tokens && config.tokens.access_token) {
      return config.tokens.access_token;
    }
  } catch (e) {
    console.error('Could not read Firebase config:', e.message);
  }
  return null;
}

// Get access token using refresh token
async function getAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: '' // Firebase CLI doesn't need a secret
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error('No access token in response: ' + body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Make Firestore REST API request
async function firestoreRequest(accessToken, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Parse Firestore document value
function parseValue(val) {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.arrayValue !== undefined) return (val.arrayValue.values || []).map(parseValue);
  if (val.mapValue !== undefined) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = parseValue(v);
    }
    return obj;
  }
  return null;
}

async function main() {
  console.log('Getting Firebase CLI credentials...');
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    console.error('Could not find Firebase CLI access token.');
    console.error('Please run: firebase login');
    process.exit(1);
  }

  console.log('Got access token from Firebase CLI.');

  // Get all liveRides
  console.log('\nFetching liveRides...');
  const ridesResponse = await firestoreRequest(accessToken, 'GET', '/liveRides');
  const rides = (ridesResponse.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    return {
      id,
      uid: parseValue(fields.uid || {}),
      streetName: parseValue(fields.streetName || {}) || 'Unknown',
      status: parseValue(fields.status || {})
    };
  });
  console.log(`Found ${rides.length} liveRides`);

  // Get all users
  console.log('Fetching users...');
  const usersResponse = await firestoreRequest(accessToken, 'GET', '/users');
  const registeredUserIds = new Set((usersResponse.documents || []).map(doc => doc.name.split('/').pop()));
  console.log(`Found ${registeredUserIds.size} registered users`);

  // Find test rides
  const testRides = rides.filter(r => !registeredUserIds.has(r.uid));

  console.log('\n=== All LiveRides ===');
  console.table(rides);

  console.log('\n=== Test Rides (Non-Registered Users) ===');
  if (testRides.length === 0) {
    console.log('No test rides found from non-registered users.');
  } else {
    console.table(testRides);

    console.log(`\nDeleting ${testRides.length} test rides...`);
    for (const ride of testRides) {
      await firestoreRequest(accessToken, 'DELETE', `/liveRides/${ride.id}`);
      console.log(`  Deleted: ${ride.id} (${ride.streetName})`);
    }
    console.log('\nCleanup complete!');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
