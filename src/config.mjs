import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load and validate allowed repositories configuration
function loadAllowedRepos() {
  try {
    const configPath = join(__dirname, '..', 'config', 'allowed_repos.json');
    const configData = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.allowedRepos || !Array.isArray(config.allowedRepos)) {
      throw new Error('Invalid config: allowedRepos must be an array');
    }
    
    // Convert to lowercase Set for case-insensitive matching
    const allowedRepos = new Set(
      config.allowedRepos.map(repo => repo.toLowerCase())
    );
    
    console.log(`[INFO] Loaded ${allowedRepos.size} allowed repositories`);
    return allowedRepos;
    
  } catch (error) {
    console.error('[ERROR] Failed to load allowed repositories config:', error.message);
    console.error('[ERROR] Server will run in read-only mode with no repository access');
    // Fail closed - return empty set
    return new Set();
  }
}

// Load configuration at module import time
export const ALLOWED_REPOS = loadAllowedRepos();

// Helper function to check if a repository is allowed
export function isAllowedRepo(owner, repo) {
  const full = `${owner}/${repo}`.toLowerCase();
  return ALLOWED_REPOS.has(full);
}

// Export the raw config for debugging
export function getConfig() {
  return {
    allowedRepos: Array.from(ALLOWED_REPOS),
    totalCount: ALLOWED_REPOS.size
  };
}
