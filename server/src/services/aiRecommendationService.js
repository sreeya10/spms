import axios from 'axios';

export const generateAIRecommendations = async (projectData, repoStats, mlResult) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. If Gemini API Key is configured, use Google Gemini API
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const prompt = `You are a Senior Academic Software Project Advisor evaluating student software projects at Vellore Institute of Technology (VIT).
Analyze the following project metrics and return a JSON response with:
1. "summary": Brief 2-3 sentence project health evaluation.
2. "strengths": Array of 2-3 positive indicators.
3. "recommendations": Array of 3-5 prioritized recommendations. Each recommendation must have:
   - "priority": "High" | "Medium" | "Low"
   - "area": "Code Quality" | "Collaboration" | "Testing" | "Version Control" | "Documentation"
   - "action": Specific concrete action step for students
   - "rationale": Why this helps before the academic review

Project Details:
- Title: ${projectData.title}
- Department: ${projectData.department}
- Days to Deadline: ${projectData.daysToDeadline || 'N/A'}
- Total Commits: ${repoStats.totalCommits}
- Open/Closed PRs: ${repoStats.openPullRequests} / ${repoStats.closedPullRequests}
- Open/Closed Issues: ${repoStats.openIssues} / ${repoStats.closedIssues}
- Readiness Score: ${mlResult.readiness_score}%
- Risk Level: ${mlResult.risk_level}
- Identified Risks: ${JSON.stringify(mlResult.identified_risks)}

Return ONLY valid JSON matching this schema, without Markdown backticks or preamble.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { timeout: 12000 }
      );

      const rawText = response.data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn('Gemini AI API call failed or timed out:', err.message);
    }
  }

  // 2. If OpenAI API Key is configured
  if (openaiKey && openaiKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an academic software advisor at VIT. Output only valid JSON with summary, strengths, and recommendations array.'
            },
            {
              role: 'user',
              content: `Project: ${projectData.title}. Readiness: ${mlResult.readiness_score}%. Risks: ${JSON.stringify(mlResult.identified_risks)}`
            }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 12000
        }
      );
      return JSON.parse(response.data.choices[0].message.content);
    } catch (err) {
      console.warn('OpenAI API call failed:', err.message);
    }
  }

  // 3. Robust Expert Academic Recommendation Engine (Zero-cost offline fallback)
  const recommendations = [];
  const strengths = [];

  if (repoStats.totalCommits >= 25) {
    strengths.push('Consistent codebase commit history demonstrating sustained engineering effort.');
  }
  if (repoStats.openPullRequests === 0 && repoStats.closedPullRequests > 0) {
    strengths.push('Clean pull request workflow with all reviewed code merged into default branch.');
  }
  if (repoStats.openIssues === 0 && repoStats.totalIssues > 0) {
    strengths.push('Effective issue backlog management with zero lingering blockers.');
  }

  // Dynamic recommendations generated from detected risks
  const risks = mlResult.identified_risks || [];
  const hasRisk = (factor) => risks.some(r => r.factor.includes(factor));

  if (hasRisk('Contributor Imbalance')) {
    recommendations.push({
      priority: 'High',
      area: 'Collaboration',
      action: 'Reallocate pending modules and assign active GitHub issues to less active team members.',
      rationale: 'Academic review panels assess individual GitHub contributions and penalize single-member carried projects.'
    });
  }

  if (hasRisk('Development Stagnation') || repoStats.daysSinceLastCommit > 7) {
    recommendations.push({
      priority: 'High',
      area: 'Version Control',
      action: 'Resume regular incremental commits (aim for at least 3-4 commits per week per team member).',
      rationale: 'Review committees inspect git timestamps to detect last-minute rush work versus continuous progress.'
    });
  }

  if (repoStats.totalBranches <= 1) {
    recommendations.push({
      priority: 'Medium',
      area: 'Version Control',
      action: 'Adopt a GitHub Flow workflow: create feature branches (e.g. `feature/auth`, `feature/ui`) and merge via Pull Requests.',
      rationale: 'Demonstrates professional industry Git practices and collaborative code review hygiene.'
    });
  }

  if (repoStats.openIssues > 2) {
    recommendations.push({
      priority: 'Medium',
      area: 'Documentation',
      action: `Triage and close the ${repoStats.openIssues} open GitHub issues, linking commit hashes to resolved issue tickets.`,
      rationale: 'Demonstrates project management tracking and structured bug-fixing.'
    });
  }

  recommendations.push({
    priority: 'Low',
    area: 'Testing',
    action: 'Add unit tests (e.g. Jest / PyTest) and include automated test execution instructions in the repository README.md.',
    rationale: 'Automated test suites significantly enhance marks in project evaluation rubrics.'
  });

  const summary = `The project "${projectData.title}" is currently evaluated at ${mlResult.readiness_score}% readiness with ${mlResult.risk_level} risk level. ${
    mlResult.risk_level === 'Low'
      ? 'The repository demonstrates good engineering cadence. Focus on documentation and final polishing.'
      : 'Immediate attention is required to address flagged development risks before the academic evaluation.'
  }`;

  return {
    summary,
    strengths: strengths.length > 0 ? strengths : ['Project repository is established and actively connected to SPMS.'],
    recommendations
  };
};
