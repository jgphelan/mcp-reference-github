# MCP GitHub Server

A Model Context Protocol (MCP) server that provides GitHub repository management capabilities through AI assistants like Claude Desktop.

## Features

- 🔍 **Search Issues**: Full-text search within repository issues and PRs
- 📝 **Create Issues**: Create new GitHub issues with proper validation
- 💬 **Comment on Issues**: Add comments to existing issues
- 📋 **List Issues**: Browse repository issues by state
- 🏷️ **Label Management**: Add/remove labels from issues and PRs
- 🎯 **Milestone Tracking**: List and manage project milestones
- 🔀 **Pull Request Management**: Label PRs, request reviews, and merge with confirmation
- 🤖 **AI Integration**: Seamless integration with Claude Desktop and other MCP clients
- 🔒 **Security Hardening**: Read-only by default, repository allowlist, and rate limiting

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Repository Access
Edit `config/allowed_repos.json` to specify which repositories your server can access:
```json
{
  "allowedRepos": [
    "your-username/your-repo",
    "another-org/another-repo"
  ]
}
```

**Important**: Only repositories listed in this file can be accessed, even with a valid token.

### 3. Set Up GitHub Token (Optional)
Create a `.env` file in your project root:
```bash
GITHUB_TOKEN=your_github_personal_access_token_here
```

**Get a GitHub Token:**
- Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
- Click "Generate new token (classic)"
- Select scopes: `repo` (private repos) or `public_repo` (public repos only)
- Copy the generated token

**Note**: If no token is provided, the server runs in read-only mode.

### 4. Start the Server
```bash
npm start
```

## Security & Setup

### Read-Only by Default
- **No Token**: Server runs in read-only mode with startup log: `[INFO] Running in read-only mode (no GITHUB_TOKEN)`
- **Read Operations**: Search and list issues work on public repositories
- **Write Operations**: `create_issue`, `comment_on_issue`, label management, and PR operations return structured errors: `"Write tools require GITHUB_TOKEN in .env"`

### Repository Allowlist
- **Access Control**: Only repositories in `config/allowed_repos.json` can be accessed
- **Fail Closed**: If the config file is missing or invalid, no repositories are accessible
- **Case Insensitive**: Repository names are matched case-insensitively
- **Error Response**: Unallowlisted repos return: `"Repository {owner}/{repo} is not allowlisted"`

### Token Requirements
- **Write Access**: Token required for creating issues, commenting, labeling, and PR operations
- **Scopes Needed**: `repo` (private repos) or `public_repo` (public repos only)
- **Rate Limiting**: Token provides higher rate limits for authenticated requests

### Rate Limiting
- **GitHub 403**: Server detects rate limit exhaustion via `X-RateLimit-Remaining: 0`
- **Helpful Errors**: Returns structured errors with hints: `"Rate limit exceeded. Please retry later."`
- **Backoff Strategy**: Clear messaging for when to retry operations

## Claude Desktop Integration

### Setup

1. **Install Claude Desktop** from [claude.ai/desktop](https://claude.ai/desktop)

2. **Add MCP Server to Claude Desktop:**
   - Open Claude Desktop
   - Go to **Settings** → **MCP Servers**
   - Click **Add Server**
   - Fill in the details:
     ```
     Name: GitHub Server
     Command: npm start
     Working Directory: /path/to/your/mcp-github-project
     ```

3. **Restart Claude Desktop**

### First Queries

Once connected, try these copy-paste examples in Claude Desktop:

#### 🔍 Search for Bug Issues
```
Search for bug issues in the facebook/react repository and show me the top 5 most recent ones.
```

#### 📝 Create a Test Issue
```
Create a test issue in my repository [your-username]/[your-repo] with the title "Test Issue from Claude" and body "This is a test issue created through Claude Desktop integration."
```

#### 💬 Comment on an Issue
```
Add a comment to issue #123 in [your-username]/[your-repo] saying "This issue has been reviewed and is being investigated."
```

#### 🏷️ Add Labels to an Issue
```
Add the labels "bug" and "high-priority" to issue #123 in [your-username]/[your-repo].
```

#### 🎯 List Milestones
```
Show me all open milestones in [your-username]/[your-repo].
```

#### 🔀 Label a Pull Request
```
Add the label "ready-for-review" to pull request #45 in [your-username]/[your-repo].
```

#### 👥 Request Review
```
Request review from users "alice" and "bob" for pull request #45 in [your-username]/[your-repo].
```

#### 🔀 Merge a Pull Request
```
Merge pull request #45 in [your-username]/[your-repo] using squash method.
```

#### 📋 List Open Issues
```
Show me all open issues in the microsoft/vscode repository.
```

#### 🔍 Advanced Search
```
Search for feature requests in the facebook/react repository that mention "hooks" and show me the top 3 results.
```

## Available Tools

| Tool | Description | Example Use | Token Required |
|------|-------------|-------------|----------------|
| `search_issues` | Search issues by query | Find bugs, features, or specific topics | ❌ No |
| `create_issue` | Create new issues | Report bugs, request features | ✅ Yes |
| `comment_on_issue` | Add comments | Provide updates, ask questions | ✅ Yes |
| `list_issues` | Browse issues by state | Review open/closed issues | ❌ No |
| `add_label_to_issue` | Add labels to issues | Categorize and prioritize issues | ✅ Yes |
| `remove_label_from_issue` | Remove labels from issues | Clean up issue categorization | ✅ Yes |
| `list_milestones` | List project milestones | Track project progress | ❌ No |
| `label_pr` | Label pull requests | Mark PRs for review, testing, etc. | ✅ Yes |
| `request_review` | Request PR reviews | Assign reviewers for code review | ✅ Yes |
| `merge_pr` | Merge pull requests | Complete PR workflow with confirmation | ✅ Yes |

## Available Resources

| Resource | Description | URI Pattern |
|----------|-------------|-------------|
| `repo-issues` | Repository issues | `github://repos/{owner}/{repo}/issues?state={state}` |
| `repo-labels` | Repository labels | `github://repos/{owner}/{repo}/labels` |
| `repo-pulls` | Repository pull requests | `github://repos/{owner}/{repo}/pulls?state={state}` |

## Advanced Usage Examples

### Label Management Workflow
```
1. List all labels in [your-username]/[your-repo]
2. Add the label "in-progress" to issue #123
3. When complete, remove "in-progress" and add "ready-for-review"
```

### Pull Request Workflow
```
1. Label PR #45 as "ready-for-review"
2. Request review from "senior-dev" and "qa-team"
3. After approval, merge using squash method
```

### Milestone Planning
```
1. List all open milestones in [your-username]/[your-repo]
2. Create issues for each milestone
3. Label issues with appropriate milestone tags
```

## Testing

Run the test suite to verify everything is working:

```bash
# Test GitHub API functions
npm run test:api

# Test MCP server functionality
npm run test:mcp

# Test hardening features
npm run test:hardening

# Test labels and PRs functionality
npm run test:labels-prs

# Run all tests
npm test
```

## Troubleshooting

### Common Issues

**"GITHUB_TOKEN not set"**
- Ensure your `.env` file exists and contains the token
- Restart the server after adding the token

**"Repository {owner}/{repo} is not allowlisted"**
- Add the repository to `config/allowed_repos.json`
- Restart the server after updating the config

**"Write tools require GITHUB_TOKEN"**
- Add your GitHub token to the `.env` file
- Ensure the token has the correct scopes

**"Resource not accessible by personal access token"**
- Check your token has the correct scopes
- Verify you have access to the repository

**"Rate limit exceeded"**
- GitHub has rate limits for API calls
- Authenticated requests have higher limits
- Wait and retry later

**MCP Connection Issues**
- Ensure Claude Desktop is restarted after adding the server
- Check the working directory path is correct
- Verify the server starts with `npm start`

## Development

### Project Structure
```
├── src/
│   ├── server.mjs      # MCP server implementation
│   ├── github.mjs      # GitHub API functions
│   ├── prompts.mjs     # AI prompt templates
│   └── config.mjs      # Configuration loader
├── config/
│   └── allowed_repos.json  # Repository allowlist
├── tests/               # Test suite
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Adding New Tools

1. Add the function to `src/github.mjs`
2. Register it in `src/server.mjs` using `server.registerTool()`
3. Add proper error handling and repository validation
4. Add tests in the `tests/` directory

### Configuration

- **Repository Access**: Edit `config/allowed_repos.json`
- **Environment**: Use `.env` for sensitive data (never commit this file)
- **Validation**: Configuration is validated at startup with fail-closed behavior

## License

Private project - not for distribution.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the test output for errors
3. Verify your GitHub token permissions
4. Check the repository allowlist configuration
