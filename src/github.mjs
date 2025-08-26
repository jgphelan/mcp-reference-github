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

// Helper function to create structured error responses
function createGitHubError(status, message, hint = "") {
  return {
    error: {
      type: status === 403 ? "rate_limited" : "github_api_error",
      message: `GitHub API error: ${message}`,
      status,
      hint: hint || (status === 403 ? "Rate limit exceeded. Please retry later." : "Check your token permissions and repository access.")
    }
  };
}

export async function listIssues(owner, repo, params = {}) {
  const url = new URL(`${BASE}/repos/${owner}/${repo}/issues`);
  const { state = "open", per_page = 20 } = params;
  url.searchParams.set("state", state);
  url.searchParams.set("per_page", String(per_page));

  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions.";
      }
    } else if (res.status === 404) {
      hint = "Repository not found or access denied.";
    }
    
    throw new Error(
      `GitHub listIssues failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function searchIssues(owner, repo, q, per_page = 10) {
  const url = new URL(`${BASE}/search/issues`);
  url.searchParams.set("q", `repo:${owner}/${repo} is:issue ${q}`);
  url.searchParams.set("per_page", String(per_page));
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Search access denied. Check repository permissions.";
      }
    } else if (res.status === 422) {
      hint = "Invalid search query. Try adding 'is:issue' or 'is:pr' qualifiers.";
    }
    
    throw new Error(
      `GitHub searchIssues failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function createIssue(owner, repo, title, body) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for createIssue");
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Repository not found or access denied.";
    }
    
    throw new Error(
      `GitHub createIssue failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
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
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Issue not found or access denied.";
    }
    
    throw new Error(
      `GitHub commentOnIssue failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

// New functions for labels and milestones
export async function listLabels(owner, repo, per_page = 100) {
  const url = new URL(`${BASE}/repos/${owner}/${repo}/labels`);
  url.searchParams.set("per_page", String(per_page));

  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions.";
      }
    } else if (res.status === 404) {
      hint = "Repository not found or access denied.";
    }
    
    throw new Error(
      `GitHub listLabels failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function addLabelToIssue(owner, repo, issue_number, labels) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for addLabelToIssue");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/issues/${issue_number}/labels`,
    {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ labels }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Issue not found or access denied.";
    } else if (res.status === 422) {
      hint = "Invalid label name or label does not exist in repository.";
    }
    
    throw new Error(
      `GitHub addLabelToIssue failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function removeLabelFromIssue(owner, repo, issue_number, label_name) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for removeLabelFromIssue");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/issues/${issue_number}/labels/${encodeURIComponent(label_name)}`,
    {
      method: "DELETE",
      headers: ghHeaders(),
    }
  );
  if (!res.ok && res.status !== 404) { // 404 means label wasn't on the issue
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Issue not found or access denied.";
    }
    
    throw new Error(
      `GitHub removeLabelFromIssue failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return { success: true };
}

export async function listMilestones(owner, repo, state = "open", per_page = 100) {
  const url = new URL(`${BASE}/repos/${owner}/${repo}/milestones`);
  url.searchParams.set("state", state);
  url.searchParams.set("per_page", String(per_page));

  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions.";
      }
    } else if (res.status === 404) {
      hint = "Repository not found or access denied.";
    }
    
    throw new Error(
      `GitHub listMilestones failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

// New functions for PRs
export async function listPullRequests(owner, repo, params = {}) {
  const url = new URL(`${BASE}/repos/${owner}/${repo}/pulls`);
  const { state = "open", per_page = 20 } = params;
  url.searchParams.set("state", state);
  url.searchParams.set("per_page", String(per_page));

  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions.";
      }
    } else if (res.status === 404) {
      hint = "Repository not found or access denied.";
    }
    
    throw new Error(
      `GitHub listPullRequests failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function labelPR(owner, repo, number, labels) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for labelPR");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/issues/${number}/labels`,
    {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ labels }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Pull request not found or access denied.";
    } else if (res.status === 422) {
      hint = "Invalid label name or label does not exist in repository.";
    }
    
    throw new Error(
      `GitHub labelPR failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function requestReview(owner, repo, number, reviewers) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for requestReview");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`,
    {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ reviewers }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Pull request not found or access denied.";
    } else if (res.status === 422) {
      hint = "Invalid reviewer username or user is not a collaborator.";
    }
    
    throw new Error(
      `GitHub requestReview failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}

export async function mergePR(owner, repo, number, method = "squash") {
  if (!TOKEN) throw new Error("GITHUB_TOKEN required for mergePR");
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/pulls/${number}/merge`,
    {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ merge_method: method }),
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    let hint = "";
    
    if (res.status === 403) {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        hint = "Rate limit exceeded. Please retry later.";
      } else {
        hint = "Access denied. Check repository permissions and token scopes.";
      }
    } else if (res.status === 404) {
      hint = "Pull request not found or access denied.";
    } else if (res.status === 405) {
      hint = "Pull request cannot be merged. Check merge requirements.";
    } else if (res.status === 409) {
      hint = "Merge conflict detected. Resolve conflicts before merging.";
    }
    
    throw new Error(
      `GitHub mergePR failed: ${res.status} ${errorText}${hint ? ` - ${hint}` : ""}`
    );
  }
  return res.json();
}
