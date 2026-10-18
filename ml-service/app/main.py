from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.metrics import ProjectMetricsInput, PredictionOutput
from app.services.predictor import predict_project

app = FastAPI(
    title="SPMS Machine Learning Service",
    description="Microservice providing project readiness estimation and risk detection for the Student Project Monitoring System",
    version="1.0.0"
)

# Enable CORS for internal communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SPMS ML Engine",
        "version": "1.0.0"
    }

@app.post("/predict", response_model=PredictionOutput)
def predict(metrics: ProjectMetricsInput):
    try:
        result = predict_project(metrics)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5001, reload=True)
