// =============================
// src/prompts.mjs
// =============================
export function triageIssuePrompt({ owner, repo }) {
  return {
    title: "Triage GitHub Issue",
    description:
      "Summarize a user report and decide whether to create a GitHub issue (guarded).",
    // Returned in MCP prompt format (messages array)
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: `You are helping triage bugs for ${owner}/${repo}. Only call the tool create_issue if:\n- The report is reproducible OR clearly actionable, and\n- It is not a duplicate based on recent open issues returned by the resource.\nIf uncertain, ask clarifying questions instead of creating an issue.`,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "Provide the user complaint and evidence here.",
        },
      },
    ],
  };
}
