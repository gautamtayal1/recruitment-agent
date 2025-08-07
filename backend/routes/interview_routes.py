"""Routes for handling interview-related endpoints"""

from fastapi import APIRouter
from services.interview_service import get_interview_status, end_interview

router = APIRouter()

@router.get("/interview-status/{call_sid}")
async def get_interview_status_endpoint(call_sid: str):
    """Get the current interview status for a call"""
    return get_interview_status(call_sid)

@router.post("/end-interview/{call_sid}")
async def end_interview_endpoint(call_sid: str):
    """End interview session and get final results"""
    return end_interview(call_sid)