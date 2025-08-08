"""Routes for handling interview-related endpoints"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.interview_service import get_interview_status, end_interview
from app.services.email_service import send_interview_selection_email, send_interview_rejection_email, send_interview_incomplete_email

router = APIRouter()

class TestEmailRequest(BaseModel):
    email: str
    email_type: str = "selection"  # "selection", "rejection", or "incomplete"
    scheduling_link: str = None  # Optional scheduling link for testing
    questions_answered: int = 3  # For incomplete email testing

@router.get("/interview-status/{call_sid}")
async def get_interview_status_endpoint(call_sid: str):
    """Get the current interview status for a call"""
    return get_interview_status(call_sid)

@router.post("/end-interview/{call_sid}")
async def end_interview_endpoint(call_sid: str):
    """End interview session and get final results"""
    return end_interview(call_sid)

@router.post("/test-email")
async def test_email_endpoint(request: TestEmailRequest):
    """Test email functionality - sends test emails for debugging"""
    try:
        if request.email_type == "selection":
            success = send_interview_selection_email(request.email, "Test Candidate", request.scheduling_link)
            message = "Interview selection email sent successfully" if success else "Failed to send selection email"
        elif request.email_type == "rejection":
            success = send_interview_rejection_email(request.email, "Test Candidate")
            message = "Interview rejection email sent successfully" if success else "Failed to send rejection email"
        elif request.email_type == "incomplete":
            success = send_interview_incomplete_email(request.email, "Test Candidate", request.questions_answered)
            message = "Interview incomplete email sent successfully" if success else "Failed to send incomplete email"
        else:
            raise HTTPException(status_code=400, detail="Invalid email_type. Use 'selection', 'rejection', or 'incomplete'")
        
        return {
            "success": success,
            "message": message,
            "email": request.email,
            "email_type": request.email_type
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error sending test email: {str(e)}",
            "email": request.email,
            "email_type": request.email_type
        }