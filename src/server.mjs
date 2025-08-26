// =============================
// src/server.mjs
// =============================
import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listIssues,
  searchIssues,
  createIssue,
  commentOnIssue,
  listLabels,
  addLabelToIssue,
  removeLabelFromIssue,
  listMilestones,
  listPullRequests,
  labelPR,
  requestReview,
  mergePR,
} from "./github.mjs";
import { triageIssuePrompt } from "./prompts.mjs";
import { isAllowedRepo } from "./config.mjs";

// Check if we have a GitHub token at startup
const HAS_TOKEN = !!process.env.GITHUB_TOKEN;

if (HAS_TOKEN) {
  console.log("[INFO] Running with GitHub token - full read/write access enabled");
} else {
  console.log("[INFO] Running in read-only mode (no GITHUB_TOKEN)");
}

const server = new McpServer({ name: "mcp-github", version: "0.1.0" });

// Utility function to check if a repository is allowed
function validateRepoAccess(owner, repo) {
  if (!isAllowedRepo(owner, repo)) {
    return {
      error: { 
        type: "forbidden", 
        message: `Repository ${owner}/${repo} is not allowlisted. Add it to config/allowed_repos.json to enable access.` 
      }
    };
  }
  return null; // Access allowed
}

// -------- Resources --------
// Dynamic resource: list issues for a repo
server.registerResource(
  "repo-issues",
  async (uri, { owner, repo, state = "open" }) => {
    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const issues = await listIssues(owner, repo, { state, per_page: 20 });
      const md = issues
        .map(
          (i) =>
            `- #${i.number} ${i.title} (by @${i.user.login})\n  ${i.html_url}`
        )
        .join("\n");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# ${owner}/${repo} issues (state=${state})\n\n${md}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  },
  {
    title: "GitHub Issues",
    description: "List issues for a repository.",
    uri: "github://repos/{owner}/{repo}/issues?state={state}",
  }
);

// New resource: list labels for a repo
server.registerResource(
  "repo-labels",
  async (uri, { owner, repo }) => {
    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const labels = await listLabels(owner, repo);
      const md = labels
        .map(
          (l) =>
            `- **${l.name}** (${l.color}) - ${l.description || 'No description'}`
        )
        .join("\n");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# ${owner}/${repo} Labels\n\n${md}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  },
  {
    title: "GitHub Labels",
    description: "List labels for a repository.",
    uri: "github://repos/{owner}/{repo}/labels",
  }
);

// New resource: list pull requests for a repo
server.registerResource(
  "repo-pulls",
  async (uri, { owner, repo, state = "open" }) => {
    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const pulls = await listPullRequests(owner, repo, { state, per_page: 20 });
      const md = pulls
        .map(
          (p) =>
            `- #${p.number} ${p.title} (by @${p.user.login})\n  ${p.html_url}\n  State: ${p.state}`
        )
        .join("\n");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `# ${owner}/${repo} Pull Requests (state=${state})\n\n${md}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  },
  {
    title: "GitHub Pull Requests",
    description: "List pull requests for a repository.",
    uri: "github://repos/{owner}/{repo}/pulls?state={state}",
  }
);

// -------- Tools --------
server.registerTool(
  "search_issues",
  {
    title: "Search GitHub Issues",
    description: "Full-text search within a repository's issues/PRs.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      query: z.string().min(2),
      per_page: z.number().int().min(1).max(50).default(10),
    },
  },
  async ({ owner, repo, query, per_page = 10 }) => {
    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const data = await searchIssues(owner, repo, query, per_page);
      const lines = data.items.map(
        (i) => `#${i.number} ${i.title} – ${i.html_url}`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "create_issue",
  {
    title: "Create GitHub Issue",
    description:
      "Create a new issue in a repository. Use only when confident and authorized.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      title: z.string().min(5).max(120),
      body: z.string().min(10).max(5000),
    },
  },
  async ({ owner, repo, title, body }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const issue = await createIssue(owner, repo, title, body);
      return {
        content: [
          {
            type: "text",
            text: `Created issue #${issue.number}: ${issue.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "comment_on_issue",
  {
    title: "Comment on GitHub Issue",
    description: "Add a comment to an existing issue.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      issue_number: z.number().int().positive(),
      body: z.string().min(1).max(5000),
    },
  },
  async ({ owner, repo, issue_number, body }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const c = await commentOnIssue(owner, repo, issue_number, body);
      return { content: [{ type: "text", text: `Commented: ${c.html_url}` }] };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

// New tools for labels and milestones
server.registerTool(
  "add_label_to_issue",
  {
    title: "Add Label to Issue",
    description: "Add one or more labels to a GitHub issue.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      issue_number: z.number().int().positive(),
      labels: z.array(z.string().min(1).max(50)).min(1).max(10),
    },
  },
  async ({ owner, repo, issue_number, labels }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const result = await addLabelToIssue(owner, repo, issue_number, labels);
      return {
        content: [
          {
            type: "text",
            text: `Added labels ${labels.join(', ')} to issue #${issue_number}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "remove_label_from_issue",
  {
    title: "Remove Label from Issue",
    description: "Remove a specific label from a GitHub issue.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      issue_number: z.number().int().positive(),
      label_name: z.string().min(1).max(50),
    },
  },
  async ({ owner, repo, issue_number, label_name }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const result = await removeLabelFromIssue(owner, repo, issue_number, label_name);
      return {
        content: [
          {
            type: "text",
            text: `Removed label "${label_name}" from issue #${issue_number}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "list_milestones",
  {
    title: "List Milestones",
    description: "List milestones for a repository.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).default("open"),
      per_page: z.number().int().min(1).max(100).default(100),
    },
  },
  async ({ owner, repo, state = "open", per_page = 100 }) => {
    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const milestones = await listMilestones(owner, repo, state, per_page);
      const lines = milestones.map(
        (m) => `#${m.number} ${m.title} (${m.state}) - ${m.description || 'No description'}`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

// New tools for PRs
server.registerTool(
  "label_pr",
  {
    title: "Label Pull Request",
    description: "Add one or more labels to a GitHub pull request.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      number: z.number().int().positive(),
      labels: z.array(z.string().min(1).max(50)).min(1).max(10),
    },
  },
  async ({ owner, repo, number, labels }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const result = await labelPR(owner, repo, number, labels);
      return {
        content: [
          {
            type: "text",
            text: `Added labels ${labels.join(', ')} to PR #${number}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "request_review",
  {
    title: "Request Review",
    description: "Request review from specific users for a pull request.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      number: z.number().int().positive(),
      reviewers: z.array(z.string().min(1).max(39)).min(1).max(10),
    },
  },
  async ({ owner, repo, number, reviewers }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    try {
      const result = await requestReview(owner, repo, number, reviewers);
      return {
        content: [
          {
            type: "text",
            text: `Requested review from ${reviewers.join(', ')} for PR #${number}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

server.registerTool(
  "merge_pr",
  {
    title: "Merge Pull Request",
    description: "Merge a pull request with confirmation requirement.",
    inputSchema: {
      owner: z.string(),
      repo: z.string(),
      number: z.number().int().positive(),
      method: z.enum(["squash", "merge", "rebase"]).default("squash"),
      require_confirmation: z.boolean().default(true),
    },
  },
  async ({ owner, repo, number, method = "squash", require_confirmation = true }) => {
    // Check if we have a token for write operations
    if (!HAS_TOKEN) {
      return {
        error: {
          type: "unauthorized",
          message: "Write tools require GITHUB_TOKEN in .env. Server is running in read-only mode."
        }
      };
    }

    // Check repository access
    const accessCheck = validateRepoAccess(owner, repo);
    if (accessCheck) return accessCheck;

    // If confirmation is required, return a message asking for confirmation
    if (require_confirmation) {
      return {
        content: [
          {
            type: "text",
            text: `⚠️  CONFIRMATION REQUIRED: Are you sure you want to merge PR #${number} using ${method} method?\n\nThis action cannot be undone. Please confirm by calling this tool again with require_confirmation=false`,
          },
        ],
      };
    }

    try {
      const result = await mergePR(owner, repo, number, method);
      return {
        content: [
          {
            type: "text",
            text: `Successfully merged PR #${number} using ${method} method: ${result.message || 'Merged'}`,
          },
        ],
      };
    } catch (error) {
      return {
        error: {
          type: "github_api_error",
          message: error.message
        }
      };
    }
  }
);

// -------- Prompts --------
server.registerPrompt(
  "triage_issue",
  {
    title: "Triage Issue",
    description:
      "Guide the model to safely decide whether to file a GitHub issue.",
    argsSchema: { owner: z.string(), repo: z.string() },
  },
  ({ owner, repo }) => triageIssuePrompt({ owner, repo })
);

// -------- Start (stdio) --------
const transport = new StdioServerTransport();
await server.connect(transport);
