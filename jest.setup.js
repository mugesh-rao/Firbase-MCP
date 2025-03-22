const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Configuration
const USE_EMULATOR = process.env.USE_FIREBASE_EMULATOR === 'true';
const TEST_USER_ID = 'testid';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';
const SERVICE_ACCOUNT_KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_PATH ||
  path.resolve(process.cwd(), 'firebaseServiceKey.json');

// Set the service account key path for environment
process.env.SERVICE_ACCOUNT_KEY_PATH = SERVICE_ACCOUNT_KEY_PATH;

// Initialize Firebase
function initializeFirebase() {
  try {
    const serviceAccountPath = SERVICE_ACCOUNT_KEY_PATH;
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
      });

      console.log('Firebase initialized for testing');
    }

    // Connect to emulator if configured
    if (USE_EMULATOR) {
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
      console.log('Using Firebase emulator suite');
    }

    return admin;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

// Initialize Firebase before any tests run
const adminApp = initializeFirebase();

// Create test user before tests
beforeAll(async () => {
  try {
    // Make sure Firebase is initialized
    if (!admin.apps.length) {
      initializeFirebase();
    }

    // Try to create the test user
    await admin.auth().createUser({
      uid: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      emailVerified: true
    }).catch(error => {
      // If user already exists, that's fine
      if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
        console.log(`Test user already exists: ${TEST_USER_EMAIL}`);
      } else {
        throw error;
      }
    });

    console.log(`Test user created/verified: ${TEST_USER_EMAIL}`);
  } catch (error) {
    console.error('Error setting up test user:', error);
  }
}, 10000); // Increase timeout for user creation

// Delete test user after tests
afterAll(async () => {
  try {
    // Make sure Firebase is initialized
    if (!admin.apps.length) {
      initializeFirebase();
    }

    await admin.auth().deleteUser(TEST_USER_ID)
      .then(() => console.log(`Test user deleted: ${TEST_USER_EMAIL}`))
      .catch(error => {
        if (error.code !== 'auth/user-not-found') {
          console.error('Error deleting test user:', error);
        }
      });
  } catch (error) {
    console.error('Error cleaning up test user:', error);
  } finally {
    // Only terminate the app if it exists and tests are complete
    if (admin.apps.length) {
      await admin.app().delete().catch(console.error);
    }
  }
}, 10000); // Increase timeout for cleanup

global.console = {
  ...console,
  log: jest.fn((message) => process.stdout.write(message + '\n')),
  info: jest.fn((message) => process.stdout.write(message + '\n')),
  warn: jest.fn((message) => process.stdout.write(message + '\n')),
  error: jest.fn((message) => process.stderr.write(message + '\n')),
};
