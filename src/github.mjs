import "dotenv/config";

const BASE = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.warn(
    "[WARN] GITHUB_TOKEN not set. Read-only calls to public repos will work; writes will fail."
  );
}

function ghHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: TOKEN ? `Bearer ${TOKEN}` : undefined,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mcp-github-reference",
  };
}

export async function listIssues(owner, repo, params = {}) {
  const url = new URL(`${BASE}/repos/${owner}/${repo}/issues`);
  const { state = "open", per_page = 20 } = params;
  url.searchParams.set("state", state);
  url.searchParams.set("per_page", String(per_page));

  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok)
    throw new Error(
      `GitHub listIssues failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}

export async function searchIssues(owner, repo, q, per_page = 10) {
  const url = new URL(`${BASE}/search/issues`);
  url.searchParams.set("q", `repo:${owner}/${repo} ${q}`);
  url.searchParams.set("per_page", String(per_page));
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok)
    throw new Error(
      `GitHub searchIssues failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}

export async function createIssue(owner, repo, title, body) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for createIssue");
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok)
    throw new Error(
      `GitHub createIssue failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}

export async function commentOnIssue(owner, repo, issue_number, body) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for commentOnIssue");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/issues/${issue_number}/comments`,
    {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok)
    throw new Error(
      `GitHub commentOnIssue failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}
