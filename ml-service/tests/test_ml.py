import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.schemas.metrics import ProjectMetricsInput, ContributorMetric
from app.services.predictor import predict_project
from app.services.rule_engine import calculate_gini

def test_gini_calculation():
    assert calculate_gini([10, 10, 10]) == 0.0
    gini_skewed = calculate_gini([100, 0, 0])
    assert gini_skewed > 0.60
    print("Gini test passed!")

def test_readiness_and_risk():
    metrics = ProjectMetricsInput(
        project_id="proj-123",
        title="Automated Attendance",
        days_to_deadline=10,
        total_commits=35,
        total_prs=5,
        merged_prs=4,
        open_prs=1,
        total_issues=8,
        closed_issues=6,
        open_issues=2,
        total_branches=3,
        days_since_last_commit=2,
        contributors=[
            ContributorMetric(username="alice", commits=18, additions=400, deletions=50, percentage=51.4),
            ContributorMetric(username="bob", commits=17, additions=350, deletions=60, percentage=48.6)
        ]
    )
    result = predict_project(metrics)
    assert 0.0 <= result.readiness_score <= 100.0
    assert result.risk_level in ["Low", "Medium", "High", "Critical"]
    print(f"Readiness Score: {result.readiness_score}, Risk Level: {result.risk_level}")
    print("Readiness & Risk test passed!")

if __name__ == "__main__":
    test_gini_calculation()
    test_readiness_and_risk()
