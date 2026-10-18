import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';

const getHeaders = (customToken = null) => {
  const token = customToken || process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SPMS-Academic-Platform-VIT'
  };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `token ${token.trim()}`;
  }
  return headers;
};

export const parseRepoUrl = (url) => {
  if (!url) return null;
  // Handle https://github.com/owner/repo or github.com/owner/repo
  const cleanUrl = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
};

export const validateRepository = async (repoUrl, customToken = null) => {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return {
      isValid: false,
      message: 'Invalid GitHub repository URL. Format should be: https://github.com/owner/repository'
    };
  }

  try {
    const res = await axios.get(`${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}`, {
      headers: getHeaders(customToken),
      timeout: 10000
    });

    return {
      isValid: true,
      owner: parsed.owner,
      repo: parsed.repo,
      fullName: res.data.full_name,
      description: res.data.description || 'No description provided.',
      defaultBranch: res.data.default_branch || 'main',
      isPrivate: res.data.private,
      starsCount: res.data.stargazers_count,
      forksCount: res.data.forks_count,
      openIssuesCount: res.data.open_issues_count
    };
  } catch (err) {
    if (err.response) {
      if (err.response.status === 404) {
        return {
          isValid: false,
          message: 'Repository not found. Please check repository name or verify access permissions for private repos.'
        };
      } else if (err.response.status === 403) {
        const rateLimitRemaining = err.response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          return {
            isValid: false,
            message: 'GitHub API rate limit exceeded. Please configure a valid GITHUB_TOKEN in server/.env.'
          };
        }
        return {
          isValid: false,
          message: 'Access forbidden. Repository may be private or token lacks permissions.'
        };
      }
    }
    return {
      isValid: false,
      message: `Failed to validate repository: ${err.message}`
    };
  }
};

export const fetchRepositoryFullData = async (owner, repo, customToken = null) => {
  const headers = getHeaders(customToken);
  const options = { headers, timeout: 12000 };

  try {
    // 1. Repo general details
    const repoRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, options);
    const repoInfo = repoRes.data;

    // 2. Commits (last 100)
    let commits = [];
    try {
      const commitRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=100`, options);
      commits = commitRes.data;
    } catch (e) {
      console.warn(`Could not fetch commits for ${owner}/${repo}:`, e.message);
    }

    // 3. Pull requests
    let pullRequests = [];
    try {
      const prRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=all&per_page=100`, options);
      pullRequests = prRes.data;
    } catch (e) {
      console.warn(`Could not fetch PRs for ${owner}/${repo}:`, e.message);
    }

    // 4. Issues (excluding PRs)
    let issues = [];
    try {
      const issuesRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=all&per_page=100`, options);
      // Filter out PRs from issues response
      issues = issuesRes.data.filter(item => !item.pull_request);
    } catch (e) {
      console.warn(`Could not fetch issues for ${owner}/${repo}:`, e.message);
    }

    // 5. Branches
    let branches = [];
    try {
      const branchRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`, options);
      branches = branchRes.data;
    } catch (e) {
      console.warn(`Could not fetch branches for ${owner}/${repo}:`, e.message);
    }

    // 6. Contributors
    let contributors = [];
    try {
      const contribRes = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=100`, options);
      contributors = Array.isArray(contribRes.data) ? contribRes.data : [];
    } catch (e) {
      console.warn(`Could not fetch contributors for ${owner}/${repo}:`, e.message);
    }

    // Compute aggregated metrics
    const totalCommits = commits.length;
    const openPRs = pullRequests.filter(pr => pr.state === 'open').length;
    const closedPRs = pullRequests.filter(pr => pr.state === 'closed').length;
    const mergedPRs = pullRequests.filter(pr => pr.merged_at !== null).length;

    const openIssues = issues.filter(issue => issue.state === 'open').length;
    const closedIssues = issues.filter(issue => issue.state === 'closed').length;

    // Last commit date
    let daysSinceLastCommit = 0;
    if (commits.length > 0 && commits[0].commit && commits[0].commit.author) {
      const lastCommitDate = new Date(commits[0].commit.author.date);
      const diffTime = Math.abs(new Date() - lastCommitDate);
      daysSinceLastCommit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // Contributors calculation with equity percentage
    const totalContribCommits = contributors.reduce((acc, c) => acc + (c.contributions || 0), 0) || totalCommits || 1;
    const formattedContributors = contributors.map(c => ({
      username: c.login,
      avatarUrl: c.avatar_url,
      commits: c.contributions || 0,
      percentage: Number(((c.contributions / totalContribCommits) * 100).toFixed(1))
    }));

    // Weekly commit activity simulation/aggregation
    const weeklyBuckets = [0, 0, 0, 0];
    const now = Date.now();
    commits.forEach(c => {
      if (c.commit && c.commit.author && c.commit.author.date) {
        const d = new Date(c.commit.author.date).getTime();
        const diffWeeks = Math.floor((now - d) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks >= 0 && diffWeeks < 4) {
          weeklyBuckets[3 - diffWeeks] += 1;
        }
      }
    });

    // Recent commit list
    const recentCommits = commits.slice(0, 15).map(c => ({
      sha: c.sha ? c.sha.substring(0, 7) : '',
      message: c.commit ? c.commit.message : '',
      author: c.commit && c.commit.author ? c.commit.author.name : 'Unknown',
      authorLogin: c.author ? c.author.login : null,
      date: c.commit && c.commit.author ? c.commit.author.date : null
    }));

    return {
      repoOwner: owner,
      repoName: repo,
      repoUrl: repoInfo.html_url,
      defaultBranch: repoInfo.default_branch || 'main',
      totalCommits,
      totalPullRequests: pullRequests.length,
      openPullRequests: openPRs,
      closedPullRequests: closedPRs,
      mergedPullRequests: mergedPRs,
      totalIssues: issues.length,
      openIssues,
      closedIssues,
      totalBranches: branches.length,
      daysSinceLastCommit,
      contributors: formattedContributors,
      weeklyActivity: weeklyBuckets,
      recentCommits,
      lastSyncedAt: new Date().toISOString()
    };
  } catch (err) {
    throw new Error(`Failed to fetch repository statistics: ${err.message}`);
  }
};
