# MCP GitHub Server Tests

This folder contains test scripts for the MCP GitHub server.

## Test Files

### `test-simple.js`
**Purpose**: Direct testing of GitHub API functions without MCP protocol
**What it tests**:
- `searchIssues()` function for facebook/react and microsoft/vscode
- `listIssues()` function for facebook/react
- Direct GitHub API integration

**Usage**:
```bash
cd tests
node test-simple.js
```

**Best for**: Quick verification that GitHub API functions work correctly

### `test-mcp-robust.js`
**Purpose**: Full MCP protocol testing with the server
**What it tests**:
- MCP server initialization
- Tool registration and execution
- Resource registration
- Full MCP protocol communication
- GitHub API integration through MCP tools

**Usage**:
```bash
cd tests
node test-mcp-robust.js
```

**Best for**: Comprehensive testing of the MCP server functionality

### `test-mcp.js`
**Purpose**: Basic MCP protocol testing (legacy version)
**Note**: This is an older version with communication issues. Use `test-mcp-robust.js` instead.

## Running Tests

### Prerequisites
1. Ensure you have a `.env` file with `GITHUB_TOKEN` set
2. Install dependencies: `npm install`
3. Make sure the server can start: `npm start`

### Quick Test
```bash
# Test GitHub API functions directly
cd tests
node test-simple.js

# Test full MCP server
cd tests
node test-mcp-robust.js
```

### Test Results
- ✅ **test-simple.js**: Should show successful GitHub API calls
- ✅ **test-mcp-robust.js**: Should show successful MCP server initialization and tool execution

## What the Tests Verify

1. **GitHub API Integration**: Authentication, rate limiting, and API responses
2. **MCP Protocol**: Server initialization, tool registration, resource registration
3. **Tool Functionality**: `search_issues`, `create_issue`, `comment_on_issue`
4. **Error Handling**: Proper error responses and authentication checks
5. **Resource Management**: Dynamic resource templates and URI parsing

## Troubleshooting

- **Timeout errors**: Increase wait time in test scripts
- **Authentication errors**: Check your `GITHUB_TOKEN` in `.env`
- **Rate limiting**: GitHub API has rate limits for unauthenticated requests
- **MCP errors**: Ensure server is running and MCP protocol version is correct
