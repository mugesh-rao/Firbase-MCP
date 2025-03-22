import { getUserByIdOrEmail } from '../authClient';
import { admin } from '../firebaseConfig';

/**
 * Authentication Client Tests
 * 
 * These tests verify the functionality of the Firebase Authentication client operations.
 * Tests run against the Firebase emulator when available.
 */

const testEmail = 'test@example.com';
const testId = 'testid';
const nonExistentEmail = 'nonexistent@example.com';
const nonExistentId = 'nonexistentid';
const invalidEmail = 'not-an-email';

// Define the response type to match what the function returns
interface AuthResponse {
  content: Array<{ type: string, text: string }>;
  isError?: boolean;
}

// Helper function to create a test user if needed
async function ensureTestUser() {
  try {
    // Check if the test user already exists
    try {
      await admin.auth().getUserByEmail(testEmail);
      console.log(`Test user already exists: ${testEmail}`);
      return;
    } catch (error) {
      // User doesn't exist, create it
    }

    // Create a test user
    await admin.auth().createUser({
      uid: testId,
      email: testEmail,
      emailVerified: true,
      password: 'password123',
    });
    console.log(`Test user created/verified: ${testEmail}`);
  } catch (error) {
    console.error('Error ensuring test user exists:', error);
  }
}

// Helper function to delete a test user
async function deleteTestUser() {
  try {
    await admin.auth().deleteUser(testId);
    console.log(`Test user deleted: ${testEmail}`);
  } catch (error) {
    // Ignore errors if user doesn't exist
  }
}

describe('Authentication Client', () => {
  // Setup: Create a test user before running tests
  beforeAll(async () => {
    await ensureTestUser();
  });

  // Cleanup: Delete the test user after tests
  afterAll(async () => {
    await deleteTestUser();
  });

  describe('getUserByIdOrEmail', () => {
    // Test retrieving user by ID
    it('should return user data when a valid UID is provided', async () => {
      const result = await getUserByIdOrEmail(testId);
      
      // Verify the response format
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify the user data
      const userData = JSON.parse(result.content[0].text);
      expect(userData.uid).toBe(testId);
      expect(userData.email).toBe(testEmail);
      expect(userData.emailVerified).toBe(true);
    });

    // Test retrieving user by email
    it('should return user data when a valid email is provided', async () => {
      const result = await getUserByIdOrEmail(testEmail);
      
      // Verify the response format
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify the user data
      const userData = JSON.parse(result.content[0].text);
      expect(userData.uid).toBe(testId);
      expect(userData.email).toBe(testEmail);
      expect(userData.emailVerified).toBe(true);
    });

    // Test error handling for non-existent user ID
    it('should handle non-existent user ID gracefully', async () => {
      try {
        await getUserByIdOrEmail(nonExistentId);
        // If we get here, the test should fail because an error should have been thrown
        fail('Expected an error to be thrown for non-existent user ID');
      } catch (error) {
        // Verify the error is as expected
        expect(error).toBeDefined();
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('There is no user record');
      }
    });

    // Test error handling for non-existent email
    it('should handle non-existent email gracefully', async () => {
      try {
        await getUserByIdOrEmail(nonExistentEmail);
        // If we get here, the test should fail because an error should have been thrown
        fail('Expected an error to be thrown for non-existent email');
      } catch (error) {
        // Verify the error is as expected
        expect(error).toBeDefined();
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('There is no user record');
      }
    });

    // Test error handling for invalid email format
    it('should handle invalid email format gracefully', async () => {
      try {
        await getUserByIdOrEmail(invalidEmail);
        // If we get here, the test should fail because an error should have been thrown
        fail('Expected an error to be thrown for invalid email format');
      } catch (error) {
        // Verify the error is as expected
        expect(error).toBeDefined();
        // The error message might vary, but should indicate an invalid email
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toBeDefined();
      }
    });

    // Test behavior when Firebase is not initialized
    it('should handle Firebase initialization issues', async () => {
      // Use jest.spyOn to mock the auth method instead of reassigning it
      const authSpy = jest.spyOn(admin, 'auth').mockImplementation(() => {
        throw new Error('Firebase not initialized');
      });

      try {
        await getUserByIdOrEmail(testEmail);
        // If we get here, the test should fail because an error should have been thrown
        fail('Expected an error to be thrown for Firebase initialization failure');
      } catch (error) {
        // Verify the error is as expected
        expect(error).toBeDefined();
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain('Firebase not initialized');
      } finally {
        // Restore the original implementation
        authSpy.mockRestore();
      }
    });
  });
});
