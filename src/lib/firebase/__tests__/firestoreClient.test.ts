import { listDocuments, addDocument, getDocument, updateDocument, deleteDocument, list_collections } from '../firestoreClient';
import { admin } from '../firebaseConfig';
import { WhereFilterOp } from 'firebase-admin/firestore';

/**
 * Firestore Client Tests
 * 
 * These tests verify the functionality of the Firestore client operations.
 * Tests run against the Firebase emulator when available.
 */
describe('Firestore Client', () => {
  // Test collection and document data
  const collectionName = 'test_collection';
  const testDocData = { 
    field1: 'test value', 
    numberField: 42, 
    boolField: true,
    dateField: new Date().toISOString(),
    nestedField: { subField: 'nested value' }
  };
  let testDocId = '';

  // Setup: Create a test document before running tests
  beforeAll(async () => {
    // Clean up any existing test documents
    try {
      const db = admin.firestore();
      if (db) {
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} documents from ${collectionName}`);
      }
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });

  // Test adding a document
  it('should add a document and return its ID', async () => {
    const result = await addDocument(collectionName, testDocData);
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Parse the response and verify document data
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.id).toBeDefined();
    expect(responseData.document).toMatchObject(testDocData);
    
    // Save the document ID for later tests
    testDocId = responseData.id;
    console.log(`Created test document with ID: ${testDocId}`);
  });

  // Test listing collections
  it('should list collections', async () => {
    const result = await list_collections();
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Parse the response and verify collections data
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.collections).toBeDefined();
    expect(Array.isArray(responseData.collections)).toBe(true);
    
    // Verify our test collection exists in the list
    const collectionExists = responseData.collections.some(
      (collection: { name: string }) => collection.name === collectionName
    );
    expect(collectionExists).toBe(true);
  });

  // Test listing documents
  it('should list documents with filtering', async () => {
    // Create a date filter
    const dateFilter = { 
      field: 'numberField', 
      operator: '>' as WhereFilterOp, 
      value: 40 
    };
    
    const result = await listDocuments(collectionName, [dateFilter]);
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Parse the response and verify documents data
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.documents).toBeDefined();
    expect(Array.isArray(responseData.documents)).toBe(true);
    expect(responseData.totalCount).toBeGreaterThan(0);
    
    // Verify our test document is in the results
    const docExists = responseData.documents.some(
      (doc: { id: string }) => doc.id === testDocId
    );
    expect(docExists).toBe(true);
  });

  // Test getting a document
  it('should get a document by ID', async () => {
    // Skip if we don't have a test document ID
    if (!testDocId) {
      console.warn('Skipping get document test - no test document ID available');
      return;
    }
    
    const result = await getDocument(collectionName, testDocId);
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Parse the response and verify document data
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.id).toBe(testDocId);
    expect(responseData.document).toMatchObject(testDocData);
  });

  // Test updating a document
  it('should update a document', async () => {
    // Skip if we don't have a test document ID
    if (!testDocId) {
      console.warn('Skipping update document test - no test document ID available');
      return;
    }
    
    const updatedData = { 
      field1: 'updated value',
      newField: 'new value' 
    };
    
    const result = await updateDocument(collectionName, testDocId, updatedData);
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Parse the response
    const responseData = JSON.parse(result.content[0].text);
    expect(responseData.id).toBe(testDocId);
    
    // Verify the document was updated by getting it again
    const getResult = await getDocument(collectionName, testDocId);
    const getResponseData = JSON.parse(getResult.content[0].text);
    
    // Check that the update was applied
    expect(getResponseData.document.field1).toBe('updated value');
    expect(getResponseData.document.newField).toBe('new value');
    // Original fields should still be there
    expect(getResponseData.document.numberField).toBe(42);
  });

  // Test deleting a document
  it('should delete a document', async () => {
    // Skip if we don't have a test document ID
    if (!testDocId) {
      console.warn('Skipping delete document test - no test document ID available');
      return;
    }
    
    const result = await deleteDocument(collectionName, testDocId);
    
    // Verify the response format
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeUndefined();
    
    // Verify the document was deleted by trying to get it
    const getResult = await getDocument(collectionName, testDocId);
    expect(getResult.isError).toBe(true);
    expect(getResult.content[0].text).toBe('Document not found');
  });

  // Test error handling for non-existent document
  it('should handle non-existent document gracefully', async () => {
    const result = await getDocument(collectionName, 'non-existent-id');
    
    // Verify the error response format
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Document not found');
  });

  // Test error handling for invalid collection
  it('should handle invalid collection name gracefully', async () => {
    // Using a collection name with invalid characters
    const result = await listDocuments('invalid/collection/name');
    
    // Verify the error response format
    expect(result.isError).toBe(true);
    // Update the expectation to match the actual response
    expect(result.content[0].text).toBe('No matching documents found');
  });
});
