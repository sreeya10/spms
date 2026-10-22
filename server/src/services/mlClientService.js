import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

// Calculate Gini in JS fallback
const calculateGiniJS = (values) => {
  if (!values || values.length <= 1) return 0.0;
  const arr = [...values].map(Number).sort((a, b) => a - b);
  const total = arr.reduce((a, b) => a + b, 0);
  if (total === 0) return 0.0;
  const n = arr.length;
  let indexSum = 0;
  for (let i = 0; i < n; i++) {
    indexSum += (i + 1) * arr[i];
  }
  const gini = (2.0 * indexSum - (n + 1.0) * total) / (n * total);
  return Math.max(0.0, Math.min(1.0, gini));
};

// Internal deterministic fallback engine
const runFallbackML = (metrics) => {
  const commits = metrics.total_commits || 0;
  let commitBase = 0;
  if (commits >= 40) commitBase = 25.0;
  else if (commits >= 20) commitBase = 18.0 + (commits - 20) * 0.35;
  else if (commits >= 5) commitBase = 8.0 + (commits - 5) * 0.66;
  else commitBase = commits * 1.5;

  let recencyPts = 0;
  const daysSince = metrics.days_since_last_commit || 0;
  if (daysSince <= 3) recencyPts = 5.0;
  else if (daysSince <= 7) recencyPts = 3.5;
  else if (daysSince <= 14) recencyPts = 1.0;

  const commitScore = Math.min(30.0, commitBase + recencyPts);

  const teamSize = (metrics.contributors || []).length;
  let collabScore = 22.0;
  let gini = 0;
  if (teamSize > 1) {
    const commitsList = metrics.contributors.map(c => c.commits || 0);
    gini = calculateGiniJS(commitsList);
    collabScore = Math.max(5.0, 25.0 * (1.0 - gini * 0.9));
  }

  let prScore = 0.0;
  const branches = metrics.total_branches || 1;
  if (branches > 2) prScore += 8.0;
  else if (branches === 2) prScore += 5.0;
  else prScore += 2.0;

  const totalPRs = metrics.total_prs || 0;
  if (totalPRs > 0) {
    const mergeRate = (metrics.merged_prs || 0) / totalPRs;
    prScore += 7.0 * mergeRate + Math.min(5.0, totalPRs * 1.2);
  } else {
    prScore = Math.min(prScore, 8.0);
  }
  prScore = Math.min(20.0, prScore);

  let issueScore = 7.5;
  const totalIssues = metrics.total_issues || 0;
  if (totalIssues > 0) {
    const closureRate = (metrics.closed_issues || 0) / totalIssues;
    issueScore = 10.0 * closureRate + Math.min(5.0, totalIssues * 0.8);
  }
  issueScore = Math.min(15.0, issueScore);

  const daysToDeadline = metrics.days_to_deadline || 30;
  let timelineScore = 10.0;
  if (daysToDeadline <= 10) timelineScore = daysSince <= 3 ? 7.0 : 2.0;
  else if (daysToDeadline <= 20) timelineScore = daysSince <= 5 ? 8.0 : 5.0;

  const readinessScore = Number(Math.min(100.0, Math.max(0.0, commitScore + collabScore + prScore + issueScore + timelineScore)).toFixed(1));

  // Risk heuristics
  const risks = [];
  const flags = [];

  if (teamSize > 1 && gini > 0.65) {
    risks.push({
      severity: 'High',
      factor: 'Contributor Imbalance',
      description: `Commit distribution is highly skewed (Gini: ${gini.toFixed(2)}). Team contributions are severely unbalanced.`,
      impact: 'Risk of evaluation penalty for uneven workload.'
    });
    flags.push('FLAG_UNEVEN_CONTRIBUTION');
  }

  if (daysSince > 14 && daysToDeadline <= 21) {
    risks.push({
      severity: 'Critical',
      factor: 'Development Stagnation Near Review',
      description: `No commits in the past ${daysSince} days with only ${daysToDeadline} days until academic review.`,
      impact: 'High risk of milestone non-completion.'
    });
    flags.push('FLAG_CRITICAL_STAGNATION');
  }

  if (teamSize > 1 && branches <= 1 && commits > 8) {
    risks.push({
      severity: 'Medium',
      factor: 'Monolithic Branching',
      description: 'All work is committed directly to the main branch without pull request peer reviews.',
      impact: 'Poor version control hygiene and increased risk of merge conflicts.'
    });
    flags.push('FLAG_NO_BRANCH_WORKFLOW');
  }

  if (totalIssues > 0 && ((metrics.open_issues || 0) / totalIssues) > 0.7 && daysToDeadline < 14) {
    risks.push({
      severity: 'High',
      factor: 'High Open Issue Backlog',
      description: `${metrics.open_issues} open issues remain unresolved close to evaluation.`,
      impact: 'Pending blockers and bugs unresolved prior to demo.'
    });
    flags.push('FLAG_ISSUE_BACKLOG');
  }

  if (commits < 5) {
    const sev = daysToDeadline < 7 ? 'Critical' : (daysToDeadline < 18 ? 'High' : 'Medium');
    risks.push({
      severity: sev,
      factor: 'Incipient Development Volume',
      description: `Only ${commits} commit(s) recorded on GitHub. Regular commits and feature branches are recommended ahead of evaluation.`,
      impact: 'Insufficient version control history to verify student contribution progression.'
    });
    flags.push('FLAG_LOW_VOLUME');
  }

  if (metrics.has_tests === false) {
    risks.push({
      severity: daysToDeadline < 14 ? 'High' : 'Medium',
      factor: 'Missing Automated Test Suite',
      description: 'No automated unit tests (e.g. Jest, Vitest, PyTest) detected in repository structure.',
      impact: 'Code verification and regression prevention cannot be validated automatically.'
    });
    flags.push('FLAG_NO_TESTS');
  }

  let riskLevel = 'Low';
  const critCount = risks.filter(r => r.severity === 'Critical').length;
  const highCount = risks.filter(r => r.severity === 'High').length;
  const medCount = risks.filter(r => r.severity === 'Medium').length;

  if (critCount >= 1) {
    riskLevel = 'Critical';
  } else if (highCount >= 2) {
    riskLevel = 'High';
  } else if (highCount === 1) {
    riskLevel = daysToDeadline <= 14 ? 'High' : 'Medium';
  } else if (medCount >= 2) {
    riskLevel = 'Medium';
  } else if (medCount === 1) {
    riskLevel = 'Low';
  }

  const riskExplanation = risks.length > 0
    ? risks.map(r => `${r.factor} (${r.severity}): ${r.description}`).join('. ')
    : 'No significant development risks detected. Activity and structure meet milestone expectations.';

  return {
    project_id: metrics.project_id,
    readiness_score: readinessScore,
    risk_level: riskLevel,
    risk_explanation: riskExplanation,
    confidence_score: 0.85,
    breakdown: {
      commit_activity_score: Number(commitScore.toFixed(1)),
      collaboration_equity_score: Number(collabScore.toFixed(1)),
      pr_workflow_score: Number(prScore.toFixed(1)),
      issue_management_score: Number(issueScore.toFixed(1)),
      timeline_health_score: Number(timelineScore.toFixed(1))
    },
    identified_risks: risks,
    heuristic_flags: flags,
    engine: 'fallback_js'
  };
};

export const predictReadinessAndRisks = async (metricsPayload) => {
  try {
    const res = await axios.post(`${ML_SERVICE_URL}/predict`, metricsPayload, {
      timeout: 3000
    });
    return {
      ...res.data,
      engine: 'python_fastapi'
    };
  } catch (err) {
    console.info(`ML Service at ${ML_SERVICE_URL} not reachable (${err.message}). Using local high-precision rule engine.`);
    return runFallbackML(metricsPayload);
  }
};
