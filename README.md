# Student Project Monitoring System (SPMS)

An intelligent platform for continuous academic and software project evaluation, combining GitHub commit/pull-request telemetry with automated machine learning risk prediction.

## System Architecture

SPMS is organized into three components:

1. **client/**: Modern React + Vite frontend with Tailwind CSS, providing dedicated role-based dashboards for Students, Faculty Supervisors, and Administrators.
2. **server/**: Node.js & Express REST API Gateway with JWT authentication, role-based access control (RBAC), GitHub API synchronization, automated PDF report generation, and persistent data storage.
3. **ml-service/**: Python FastAPI microservice providing machine learning-based project readiness scoring, risk classification, and prescriptive engineering recommendations.

## Getting Started

### 1. Backend Server (server)
`ash
cd server
npm install
npm run dev
`
Runs on http://localhost:5000.

### 2. Frontend Application (client)
`ash
cd client
npm install
npm run dev
`
Runs on http://localhost:5173.

### 3. Machine Learning Service (ml-service)
`ash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --port 5001 --reload
`
Runs on http://localhost:5001.

## Key Features
- **Multi-Project Management**: Support for concurrent projects per student with isolated team rosters, telemetry, and repositories.
- **GitHub Continuous Telemetry**: Automatic tracking of commit frequency, pull requests, issue resolution rates, and collaboration metrics.
- **ML Readiness & Risk Prediction**: Real-time evaluation of project health scores, risk classifications, and AI-driven recommendations.
- **PDF Export & Governance**: Automated executive status report generation and audit logging.
