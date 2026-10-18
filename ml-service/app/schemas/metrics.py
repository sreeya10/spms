from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ContributorMetric(BaseModel):
    username: str
    commits: int = 0
    additions: int = 0
    deletions: int = 0
    percentage: float = 0.0

class ProjectMetricsInput(BaseModel):
    project_id: str
    title: str = "Project"
    days_to_deadline: int = Field(default=30, ge=0)
    total_commits: int = Field(default=0, ge=0)
    total_prs: int = Field(default=0, ge=0)
    merged_prs: int = Field(default=0, ge=0)
    open_prs: int = Field(default=0, ge=0)
    total_issues: int = Field(default=0, ge=0)
    closed_issues: int = Field(default=0, ge=0)
    open_issues: int = Field(default=0, ge=0)
    total_branches: int = Field(default=1, ge=1)
    days_since_last_commit: int = Field(default=0, ge=0)
    weekly_commits: List[int] = Field(default_factory=list)
    contributors: List[ContributorMetric] = Field(default_factory=list)

class RiskFactor(BaseModel):
    severity: str  # "Low", "Medium", "High", "Critical"
    factor: str
    description: str
    impact: str

class ReadinessBreakdown(BaseModel):
    commit_activity_score: float
    collaboration_equity_score: float
    pr_workflow_score: float
    issue_management_score: float
    timeline_health_score: float

class PredictionOutput(BaseModel):
    project_id: str
    readiness_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str  # "Low", "Medium", "High", "Critical"
    confidence_score: float
    breakdown: ReadinessBreakdown
    identified_risks: List[RiskFactor]
    heuristic_flags: List[str]
