"""
Modular FastAPI application for JavaScript interview system
"""

import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import PORT
from app.routes.call_routes import router as call_router
from app.routes.interview_routes import router as interview_router
from app.websocket.conversation_handler import handle_websocket_connection

# Create FastAPI app
app = FastAPI(
    title="JavaScript Interview System",
    description="AI-powered JavaScript technical interviews via voice calls",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(call_router)
app.include_router(interview_router)

@app.get("/")
async def root():
    return {
        "message": "JavaScript Interview System API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await handle_websocket_connection(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
    print(f"Server running at http://localhost:{PORT}")