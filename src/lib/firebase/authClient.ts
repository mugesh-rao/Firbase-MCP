/**
 * Firebase Authentication Client
 * 
 * This module provides functions for interacting with Firebase Authentication.
 * It allows retrieving user information by user ID or email address.
 * 
 * @module firebase-mcp/auth
 */

import { db, admin } from './firebaseConfig';

/**
 * Retrieves user information from Firebase Authentication using either a user ID or email address.
 * The function automatically detects whether the identifier is an email address (contains '@')
 * or a user ID and uses the appropriate Firebase Auth method.
 * 
 * @param {string} identifier - The user ID or email address to look up
 * @returns {Promise<Object>} A formatted response object containing the user information
 * @throws {Error} If the user cannot be found or if there's an authentication error
 * 
 * @example
 * // Get user by email
 * const userInfo = await getUserByIdOrEmail('user@example.com');
 * 
 * @example
 * // Get user by ID
 * const userInfo = await getUserByIdOrEmail('abc123xyz456');
 */
export async function getUserByIdOrEmail(identifier: string) {
  try {
    let userRecord;
    
    // Determine whether to search by email or user ID based on the presence of '@'
    if (identifier.includes('@')) {
      // Search by email address
      userRecord = await admin.auth().getUserByEmail(identifier);
    } else {
      // Search by user ID
      userRecord = await admin.auth().getUser(identifier);
    }
    
    // Return the user information in the MCP response format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(userRecord, null, 2)
        }
      ]
    };
  } catch (error) {
    // Log the error and re-throw it to be handled by the MCP server
    console.error('Error fetching user:', error);
    throw error;
  }
}
