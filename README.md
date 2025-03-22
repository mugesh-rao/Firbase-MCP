# Firebase MCP Server

![Project Logo](./assets/logo.png)

<a href="https://glama.ai/mcp/servers/x4i8z2xmrq">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/x4i8z2xmrq/badge" alt="Firebase MCP server" />
</a>

[![Firebase Tests CI](https://github.com/gannonh/firebase-mcp/actions/workflows/firebase-tests.yml/badge.svg)](https://github.com/gannonh/firebase-mcp/actions/workflows/firebase-tests.yml)

## Overview

The [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) is an open protocol that enables LLM client applications to use tools and access external data sources. This MCP server allows any LLM client that supports the MCP protocol to interact with Firebase services including:

- **Authentication**: User management and verification
- **Firestore**: Document database operations
- **Storage**: File storage and retrieval

The server exposes Firebase services through MCP tools, making them accessible to LLM clients including [Claude Desktop](https://claude.ai/download), [Cursor](https://www.cursor.com/), [Roo Code](https://github.com/RooVetGit/Roo-Code), and [Cline](https://cline.bot/), while handling authentication and connection management.

## Setup

> The easiest way to install the Firebase MCP server is to simply feed your LLM client (like Cline) the [llms-install.md](./llms-install.md) file.

### 1. Firebase Configuration

- Go to [Firebase Console](https://console.firebase.google.com)
- Navigate to Project Settings > Service Accounts
- Click "Generate new private key"
- Save the JSON file securely

### 2. Environment Variables

The server requires the following environment variables:

- `SERVICE_ACCOUNT_KEY_PATH`: Path to your Firebase service account key JSON file (required)
- `FIREBASE_STORAGE_BUCKET`: Bucket name for Firebase Storage (optional)
  - If not provided, defaults to `[projectId].appspot.com`

### 3. Install MCP Server

Add the server configuration to your MCP settings file:

- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cursor: `[project root]/.cursor/mcp.json`
- Roo Code (VS Code Extension): (`~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`)
- Cline (VS Code Extension): `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

MCP Servers can be installed manually or at runtime via npx (recommended). How you install determines your configuration:

#### Configure for npx

   ```json
   {
     "firebase-mcp": {
       "command": "npx",
       "args": [
         "-y",
         "@gannonh/firebase-mcp"
       ],
       "env": {
         "SERVICE_ACCOUNT_KEY_PATH": "/absolute/path/to/serviceAccountKey.json",
         "FIREBASE_STORAGE_BUCKET": "your-project-id.firebasestorage.app"
       }
     }
   }
   ```

#### Configure for local installation

   ```json
   {
     "firebase-mcp": {
       "command": "node",
       "args": [
         "/absolute/path/to/firebase-mcp/dist/index.js"
       ],
       "env": {
         "SERVICE_ACCOUNT_KEY_PATH": "/absolute/path/to/serviceAccountKey.json",
         "FIREBASE_STORAGE_BUCKET": "your-project-id.firebasestorage.app"
       }
     }
   }
   ```

#### Manual Installation

##### Install Dependencies

   ```bash
   git clone https://github.com/gannonh/firebase-mcp
   cd firebase-mcp
   npm install
   ```

##### Build the Project

   ```bash
   npm run build
   ```

### Test your Installation

To make sure everything is working, simply prompt your client: `Please run through and test all of your Firebase MCP tools.`

## Features

### Authentication Tools

- `auth_get_user`: Get user details by ID or email

  ```typescript
  {
    identifier: string // User ID or email address
  }
  ```

### Firestore Tools

- `firestore_add_document`: Add a document to a collection

  ```typescript
  {
    collection: string,
    data: object
  }
  ```

- `firestore_list_collections`: List available collections

  ```typescript
  {
    documentPath?: string, // Optional parent document path
    limit?: number,        // Default: 20
    pageToken?: string     // For pagination
  }
  ```

- `firestore_list_documents`: List documents with optional filtering

  ```typescript
  {
    collection: string,
    filters?: Array<{
      field: string,
      operator: string,
      value: any
    }>,
    limit?: number,
    pageToken?: string
  }
  ```

- `firestore_get_document`: Get a specific document

  ```typescript
  {
    collection: string,
    id: string
  }
  ```

- `firestore_update_document`: Update an existing document

  ```typescript
  {
    collection: string,
    id: string,
    data: object
  }
  ```

- `firestore_delete_document`: Delete a document

  ```typescript
  {
    collection: string,
    id: string
  }
  ```

### Storage Tools

- `storage_list_files`: List files in a directory

  ```typescript
  {
    directoryPath?: string, // Optional path, defaults to root
    pageSize?: number,      // Number of items per page, defaults to 10
    pageToken?: string      // Token for pagination
  }
  ```

- `storage_get_file_info`: Get file metadata and download URL

  ```typescript
  {
    filePath: string // Path to the file in storage
  }
  ```

## Development

### Building

```bash
npm run build
```

### Testing

The project uses Jest for testing. Tests can be run against Firebase emulators to avoid affecting production data.

1. **Install Firebase Emulators**

   ```bash
   npm install -g firebase-tools
   firebase init emulators
   ```

2. **Start Emulators**

   ```bash
   firebase emulators:start
   ```

3. **Run Tests**

   ```bash
   npm run test:emulator
   ```

### Architecture

The server is structured into three main components:

```
src/
├── index.ts              # Server entry point
└── lib/
    └── firebase/
        ├── authClient.ts       # Authentication operations
        ├── firebaseConfig.ts   # Firebase configuration
        ├── firestoreClient.ts  # Firestore operations
        └── storageClient.ts    # Storage operations
```

Each client module implements specific Firebase service operations and exposes them as MCP tools.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Related Resources

- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Troubleshooting

### Common Issues

#### "The specified bucket does not exist" Error

If you encounter this error when trying to access Firebase Storage:

1. Check that your Firebase project has Storage enabled
   - Go to the Firebase Console
   - Navigate to Storage
   - Complete the initial setup if you haven't already

2. Verify the correct bucket name
   - The default bucket name is usually `[projectId].appspot.com`
   - Some projects use `[projectId].firebasestorage.app` instead
   - You can find your bucket name in the Firebase Console under Storage

3. Set the `FIREBASE_STORAGE_BUCKET` environment variable
   - Add the correct bucket name to your MCP configuration
   - Example: `"FIREBASE_STORAGE_BUCKET": "your-project-id.firebasestorage.app"`

#### "Firebase is not initialized" Error

If you see this error:

1. Verify your service account key path
   - Make sure the path in `SERVICE_ACCOUNT_KEY_PATH` is correct and absolute
   - Check that the file exists and is readable

2. Check service account permissions
   - Ensure the service account has the necessary permissions for the Firebase services you're using
   - For Storage, the service account needs the Storage Admin role

#### JSON Parsing Errors

If you see errors about invalid JSON:

1. Make sure there are no `console.log` statements in the code
   - All logging should use `console.error` to avoid interfering with the JSON communication
   - The MCP protocol uses stdout for JSON communication

2. Check for syntax errors in your requests
   - Verify that all parameters are correctly formatted
   - Check for typos in field names
