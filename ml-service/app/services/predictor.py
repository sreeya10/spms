from typing import List, Dict, Any
from app.schemas.metrics import (
    ProjectMetricsInput, 
    PredictionOutput, 
    ReadinessBreakdown, 
    RiskFactor
)
from app.services.rule_engine import evaluate_rules, calculate_gini

def calculate_readiness(metrics: ProjectMetricsInput) -> ReadinessBreakdown:
    # 1. Commit Activity Score (Max 30)
    commits = metrics.total_commits
    if commits >= 40:
        commit_base = 25.0
    elif commits >= 20:
        commit_base = 18.0 + (commits - 20) * 0.35
    elif commits >= 5:
        commit_base = 8.0 + (commits - 5) * 0.66
    else:
        commit_base = max(0.0, float(commits * 1.5))
    
    # Recency bonus/penalty (up to 5 points)
    if metrics.days_since_last_commit <= 3:
        recency_pts = 5.0
    elif metrics.days_since_last_commit <= 7:
        recency_pts = 3.5
    elif metrics.days_since_last_commit <= 14:
        recency_pts = 1.0
    else:
        recency_pts = 0.0
    
    commit_score = min(30.0, commit_base + recency_pts)

    # 2. Collaboration Equity Score (Max 25)
    team_size = len(metrics.contributors)
    if team_size <= 1:
        collab_score = 22.0  # Solo project has inherent parity
    else:
        commits_list = [c.commits for c in metrics.contributors]
        gini = calculate_gini(commits_list)
        collab_score = max(5.0, 25.0 * (1.0 - gini * 0.9))

    # 3. PR & Branch Workflow Score (Max 20)
    pr_score = 0.0
    if metrics.total_branches > 2:
        pr_score += 8.0
    elif metrics.total_branches == 2:
        pr_score += 5.0
    else:
        pr_score += 2.0
    
    if metrics.total_prs > 0:
        merge_rate = metrics.merged_prs / metrics.total_prs
        pr_score += 7.0 * merge_rate
        if metrics.total_prs >= 4:
            pr_score += 5.0
        else:
            pr_score += metrics.total_prs * 1.2
    else:
        pr_score = min(pr_score, 8.0)
    
    pr_score = min(20.0, pr_score)

    # 4. Issue Management Score (Max 15)
    if metrics.total_issues > 0:
        closure_rate = metrics.closed_issues / metrics.total_issues
        issue_score = 10.0 * closure_rate + min(5.0, metrics.total_issues * 0.8)
    else:
        issue_score = 7.5
    issue_score = min(15.0, issue_score)

    # 5. Timeline Health Score (Max 10)
    if metrics.days_to_deadline > 20:
        timeline_score = 10.0
    elif metrics.days_to_deadline > 10:
        timeline_score = 8.0 if metrics.days_since_last_commit <= 5 else 5.0
    else:
        timeline_score = 7.0 if metrics.days_since_last_commit <= 3 else 2.0

    return ReadinessBreakdown(
        commit_activity_score=round(commit_score, 2),
        collaboration_equity_score=round(collab_score, 2),
        pr_workflow_score=round(pr_score, 2),
        issue_management_score=round(issue_score, 2),
        timeline_health_score=round(timeline_score, 2)
    )

def predict_project(metrics: ProjectMetricsInput) -> PredictionOutput:
    breakdown = calculate_readiness(metrics)
    raw_readiness = (
        breakdown.commit_activity_score +
        breakdown.collaboration_equity_score +
        breakdown.pr_workflow_score +
        breakdown.issue_management_score +
        breakdown.timeline_health_score
    )
    readiness_score = round(max(0.0, min(100.0, raw_readiness)), 1)

    risks, flags = evaluate_rules(metrics)

    critical_count = sum(1 for r in risks if r.severity == "Critical")
    high_count = sum(1 for r in risks if r.severity == "High")

    if critical_count >= 1 or readiness_score < 35.0:
        risk_level = "Critical"
    elif high_count >= 2 or readiness_score < 55.0:
        risk_level = "High"
    elif high_count == 1 or readiness_score < 75.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    confidence = 0.85
    if metrics.total_commits > 15:
        confidence += 0.08
    if len(metrics.contributors) > 0:
        confidence += 0.05
    confidence = min(0.98, round(confidence, 2))

    return PredictionOutput(
        project_id=metrics.project_id,
        readiness_score=readiness_score,
        risk_level=risk_level,
        confidence_score=confidence,
        breakdown=breakdown,
        identified_risks=risks,
        heuristic_flags=flags
    )
