from typing import List, Tuple
from app.schemas.metrics import ProjectMetricsInput, RiskFactor

def calculate_gini(values: List[float]) -> float:
    """Calculate Gini coefficient in pure Python."""
    if not values or len(values) <= 1:
        return 0.0
    arr = sorted([float(v) for v in values])
    total = sum(arr)
    if total == 0:
        return 0.0
    n = len(arr)
    index_sum = sum((i + 1) * val for i, val in enumerate(arr))
    gini = (2.0 * index_sum - (n + 1.0) * total) / (n * total)
    return float(max(0.0, min(1.0, gini)))

def evaluate_rules(metrics: ProjectMetricsInput) -> Tuple[List[RiskFactor], List[str]]:
    risks: List[RiskFactor] = []
    flags: List[str] = []

    # 1. Collaboration & Team Equity
    team_size = len(metrics.contributors)
    if team_size > 1:
        commits = [c.commits for c in metrics.contributors]
        gini = calculate_gini(commits)
        if gini > 0.65:
            risks.append(RiskFactor(
                severity="High",
                factor="Contributor Imbalance",
                description=f"Commit distribution is highly skewed (Gini coefficient: {gini:.2f}). One or two members may be doing disproportionate work.",
                impact="Potential academic evaluation penalties for unequal team contribution."
            ))
            flags.append("FLAG_UNEVEN_CONTRIBUTION")
        
        # Check if anyone has 0 commits
        zero_committers = [c.username for c in metrics.contributors if c.commits == 0]
        if zero_committers:
            risks.append(RiskFactor(
                severity="Critical" if metrics.days_to_deadline < 14 else "Medium",
                factor="Inactive Team Members",
                description=f"Team members with zero recorded commits: {', '.join(zero_committers)}.",
                impact="Risk of failing minimum individual contribution criteria."
            ))
            flags.append("FLAG_INACTIVE_MEMBERS")

    # 2. Activity Recency & Deadline Proximity
    if metrics.days_since_last_commit > 14 and metrics.days_to_deadline <= 21:
        risks.append(RiskFactor(
            severity="Critical",
            factor="Development Stagnation Near Review",
            description=f"No commits detected in the last {metrics.days_since_last_commit} days, with only {metrics.days_to_deadline} days remaining until evaluation.",
            impact="High probability of incomplete deliverables at project review."
        ))
        flags.append("FLAG_CRITICAL_STAGNATION")
    elif metrics.days_since_last_commit > 10:
        risks.append(RiskFactor(
            severity="Medium",
            factor="Lapse in Commit Activity",
            description=f"Last commit was {metrics.days_since_last_commit} days ago.",
            impact="Velocity drop may impact milestone completion."
        ))
        flags.append("FLAG_ACTIVITY_LAPSE")

    # 3. Pull Request and Branching Workflow
    if team_size > 1 and metrics.total_branches <= 1 and metrics.total_commits > 8:
        risks.append(RiskFactor(
            severity="Medium",
            factor="Monolithic Branching",
            description="Team is committing directly to the main branch without feature branches or PR reviews.",
            impact="Code quality and integration issues; lack of demonstrated collaborative Git workflow."
        ))
        flags.append("FLAG_NO_BRANCH_WORKFLOW")

    if metrics.total_prs > 0:
        unmerged_ratio = metrics.open_prs / metrics.total_prs
        if unmerged_ratio > 0.6 and metrics.open_prs >= 3:
            risks.append(RiskFactor(
                severity="High",
                factor="PR Merge Bottleneck",
                description=f"{metrics.open_prs} out of {metrics.total_prs} pull requests are currently open and unmerged.",
                impact="Unmerged code causes merge conflicts and delays integration testing."
            ))
            flags.append("FLAG_PR_BOTTLENECK")

    # 4. Issue Resolution Velocity
    if metrics.total_issues > 0:
        open_issue_ratio = metrics.open_issues / metrics.total_issues
        if open_issue_ratio > 0.7 and metrics.days_to_deadline < 14:
            risks.append(RiskFactor(
                severity="High",
                factor="High Open Issue Backlog",
                description=f"{metrics.open_issues} open issues remain unresolved near deadline.",
                impact="Bugs and pending tasks remaining right before evaluation."
            ))
            flags.append("FLAG_ISSUE_BACKLOG")

    # 5. Low overall commit threshold check
    if metrics.total_commits < 5:
        risks.append(RiskFactor(
            severity="Critical" if metrics.days_to_deadline < 14 else "High",
            factor="Incipient Development Volume",
            description=f"Only {metrics.total_commits} total commits recorded in repository.",
            impact="Insufficient codebase progress to demonstrate milestone completion."
        ))
        flags.append("FLAG_LOW_VOLUME")

    return risks, flags
