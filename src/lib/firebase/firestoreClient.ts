/**
 * Firebase Firestore Client
 * 
 * This module provides functions for interacting with Firebase Firestore database.
 * It includes operations for listing collections, querying documents, and performing CRUD operations.
 * All functions return data in a format compatible with the MCP protocol response structure.
 * 
 * @module firebase-mcp/firestore
 */

import { Query, Timestamp } from 'firebase-admin/firestore';
import {db, getProjectId} from './firebaseConfig';
import fs from 'fs';
import path from 'path';

/**
 * Lists collections in Firestore, either at the root level or under a specific document.
 * Results are paginated and include links to the Firebase console.
 * 
 * @param {string} [documentPath] - Optional path to a document to list subcollections
 * @param {number} [limit=20] - Maximum number of collections to return
 * @param {string} [pageToken] - Token for pagination (collection ID to start after)
 * @returns {Promise<Object>} MCP-formatted response with collection data
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // List root collections
 * const rootCollections = await list_collections();
 * 
 * @example
 * // List subcollections of a document
 * const subCollections = await list_collections('users/user123');
 */
export async function list_collections(documentPath?: string, limit: number = 20, pageToken?: string) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    let collections;
    if (documentPath) {
      // Get subcollections of a specific document
      const docRef = db.doc(documentPath);
      collections = await docRef.listCollections();
    } else {
      // Get root collections
      collections = await db.listCollections();
    }
    
    // Sort collections by name for consistent ordering
    collections.sort((a, b) => a.id.localeCompare(b.id));
    
    // Find start index for pagination
    const startIndex = pageToken ? collections.findIndex(c => c.id === pageToken) + 1 : 0;
    
    // Apply limit for pagination
    const paginatedCollections = collections.slice(startIndex, startIndex + limit);
    
    // Get project ID for console URLs
    const projectId = getProjectId();
    const collectionData = paginatedCollections.map((collection) => {
      const collectionUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/${documentPath}/${collection.id}`;
      return { name: collection.id, url: collectionUrl };
    });
    
    // Format response for MCP
    return { 
      content: [{
        type: 'text', 
        text: JSON.stringify({
          collections: collectionData,
          nextPageToken: collections.length > startIndex + limit ? 
            paginatedCollections[paginatedCollections.length - 1].id : null,
          hasMore: collections.length > startIndex + limit
        })
      }]
    };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error listing collections: ${(error as Error).message}` }], isError: true };
  }
}

/**
 * Converts Firestore Timestamp objects to ISO string format for JSON serialization.
 * This is a helper function used internally by other functions.
 * 
 * @param {any} data - The data object containing potential Timestamp fields
 * @returns {any} The same data object with Timestamps converted to ISO strings
 * @private
 */
function convertTimestampsToISO(data: any) {
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate().toISOString();
    }
  }
  return data;
}

/**
 * Lists documents in a Firestore collection with optional filtering and pagination.
 * Results include document data, IDs, and links to the Firebase console.
 * 
 * @param {string} collection - The collection path to query
 * @param {Array<Object>} [filters=[]] - Array of filter conditions with field, operator, and value
 * @param {number} [limit=20] - Maximum number of documents to return
 * @param {string} [pageToken] - Token for pagination (document ID to start after)
 * @returns {Promise<Object>} MCP-formatted response with document data
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // List all documents in a collection
 * const allDocs = await listDocuments('users');
 * 
 * @example
 * // List documents with filtering
 * const filteredDocs = await listDocuments('users', [
 *   { field: 'age', operator: '>=', value: 21 },
 *   { field: 'status', operator: '==', value: 'active' }
 * ]);
 */
export async function listDocuments(collection: string, filters: Array<{ field: string, operator: FirebaseFirestore.WhereFilterOp, value: any }> = [], limit: number = 20, pageToken?: string) {
  const projectId = getProjectId();
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    // Get reference to the collection
    const collectionRef = db.collection(collection);
    let filteredQuery: Query = collectionRef;
    
    // Apply filters
    for (const filter of filters) {
      let filterValue = filter.value;
      // Convert string dates to Firestore Timestamps
      if (typeof filterValue === 'string' && !isNaN(Date.parse(filterValue))) {
        filterValue = Timestamp.fromDate(new Date(filterValue));
      }
      filteredQuery = filteredQuery.where(filter.field, filter.operator, filterValue);
    }
    
    // Apply pagination if a page token is provided
    if (pageToken) {
      const startAfterDoc = await collectionRef.doc(pageToken).get();
      filteredQuery = filteredQuery.startAfter(startAfterDoc);
    }

    // Get total count of documents matching the filter
    const countSnapshot = await filteredQuery.get();
    const totalCount = countSnapshot.size;

    // Get the documents with limit applied
    const limitedQuery = filteredQuery.limit(limit);
    const snapshot = await limitedQuery.get();

    // Handle empty results
    if (snapshot.empty) {
      return { content: [{ type: 'text', text: 'No matching documents found' }], isError: true };
    }
    
    // Process document data
    const documents = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      convertTimestampsToISO(data);
      const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/${collection}/${doc.id}`;
      return { id: doc.id, url: consoleUrl, document: data };
    });
    
    // Format response for MCP
    return { 
      content: [{
        type: 'text', 
        text: JSON.stringify({
          totalCount,
          documents,
          pageToken: documents.length > 0 ? documents[documents.length - 1].id : null,
          hasMore: totalCount > limit
        })
      }]
    };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error listing documents: ${(error as Error).message}` }], isError: true };
  }
}

/**
 * Adds a new document to a Firestore collection with auto-generated ID.
 * 
 * @param {string} collection - The collection path to add the document to
 * @param {any} data - The document data to add
 * @returns {Promise<Object>} MCP-formatted response with the new document ID and data
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // Add a new user document
 * const result = await addDocument('users', { 
 *   name: 'John Doe', 
 *   email: 'john@example.com',
 *   createdAt: new Date()
 * });
 */
export async function addDocument(collection: string, data: any) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    // Add the document and get its reference
    const docRef = await db.collection(collection).add(data);
    const projectId = getProjectId();
    
    // Convert timestamps for JSON serialization
    convertTimestampsToISO(data);
    
    // Generate console URL for the new document
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/${collection}/${docRef.id}`;
    
    // Format response for MCP
    return { content: [{ type: 'text', text: JSON.stringify({ id: docRef.id, url: consoleUrl, document: data }) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error adding document: ${(error as Error).message}` }], isError: true };
  }
}

/**
 * Retrieves a specific document from a Firestore collection by ID.
 * 
 * @param {string} collection - The collection path containing the document
 * @param {string} id - The document ID to retrieve
 * @returns {Promise<Object>} MCP-formatted response with the document data
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // Get a specific user document
 * const user = await getDocument('users', 'user123');
 */
export async function getDocument(collection: string, id: string) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    // Get the document
    const doc = await db.collection(collection).doc(id).get();
    
    // Handle document not found
    if (!doc.exists) {
      return { content: [{ type: 'text', text: 'Document not found' }], isError: true };
    }
    
    // Get project ID for console URL
    const projectId = getProjectId();
    const data = doc.data();
    
    // Convert timestamps for JSON serialization
    convertTimestampsToISO(data);
    
    // Generate console URL for the document
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/${collection}/${id}`;
    
    // Format response for MCP
    return { content: [{ type: 'text', text: JSON.stringify({ id, url: consoleUrl, document: data }) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error getting document: ${(error as Error).message}` }], isError: true };
  }
}

/**
 * Updates an existing document in a Firestore collection.
 * 
 * @param {string} collection - The collection path containing the document
 * @param {string} id - The document ID to update
 * @param {any} data - The document data to update (fields will be merged)
 * @returns {Promise<Object>} MCP-formatted response with the updated document data
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // Update a user's status
 * const result = await updateDocument('users', 'user123', { 
 *   status: 'inactive',
 *   lastUpdated: new Date()
 * });
 */
export async function updateDocument(collection: string, id: string, data: any) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    // Update the document
    await db.collection(collection).doc(id).update(data);
    
    // Get project ID for console URL
    const projectId = getProjectId();
    
    // Convert timestamps for JSON serialization
    convertTimestampsToISO(data);
    
    // Generate console URL for the document
    const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/${collection}/${id}`;
    
    // Format response for MCP
    return { content: [{ type: 'text', text: JSON.stringify({ id, url: consoleUrl, document: data }) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error updating document: ${(error as Error).message}` }], isError: true };
  }
}

/**
 * Deletes a document from a Firestore collection.
 * 
 * @param {string} collection - The collection path containing the document
 * @param {string} id - The document ID to delete
 * @returns {Promise<Object>} MCP-formatted response confirming deletion
 * @throws {Error} If Firebase is not initialized or if there's a Firestore error
 * 
 * @example
 * // Delete a user document
 * const result = await deleteDocument('users', 'user123');
 */
export async function deleteDocument(collection: string, id: string) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return { content: [{ type: 'text', text: 'Firebase is not initialized. SERVICE_ACCOUNT_KEY_PATH environment variable is required.' }], isError: true };
    }
    
    // Delete the document
    await db.collection(collection).doc(id).delete();
    
    // Format response for MCP
    return { content: [{ type: 'text', text: 'Document deleted successfully' }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error deleting document: ${(error as Error).message}` }], isError: true };
  }
}
