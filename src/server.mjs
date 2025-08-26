// =============================
// src/server.mjs
// =============================
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listIssues,
  searchIssues,
  createIssue,
  commentOnIssue,
} from "./github.mjs";
import { triageIssuePrompt } from "./prompts.mjs";

const server = new McpServer({ name: "mcp-github", version: "0.1.0" });

// -------- Resources --------
// Dynamic resource: list issues for a repo
server.registerResource(
  "repo-issues",
  new ResourceTemplate("github://repos/{owner}/{repo}/issues?state={state}", {
    list: undefined,
  }),
  {
    title: "GitHub Issues",
    description: "List issues for a repository.",
  },
  async (uri, { owner, repo, state = "open" }) => {
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
    const data = await searchIssues(owner, repo, query, per_page);
    const lines = data.items.map(
      (i) => `#${i.number} ${i.title} – ${i.html_url}`
    );
    return { content: [{ type: "text", text: lines.join("\n") }] };
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
    const issue = await createIssue(owner, repo, title, body);
    return {
      content: [
        {
          type: "text",
          text: `Created issue #${issue.number}: ${issue.html_url}`,
        },
      ],
    };
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
    const c = await commentOnIssue(owner, repo, issue_number, body);
    return { content: [{ type: "text", text: `Commented: ${c.html_url}` }] };
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
