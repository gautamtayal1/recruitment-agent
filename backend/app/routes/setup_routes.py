"""Routes for interview setup and configuration"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
from twilio.rest import Client

from app.config import OPENAI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DOMAIN
from app.models.questions import JS_QUESTIONS

router = APIRouter()
openai = OpenAI(api_key=OPENAI_API_KEY)
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Store interview configurations (in production, use a database)
interview_configs = {}

class QuestionGenerationRequest(BaseModel):
    language: str
    prompt: str

class InterviewSetupRequest(BaseModel):
    phoneNumber: str
    email: Optional[str] = None
    language: Optional[str] = None
    customPrompt: Optional[str] = None
    yoe: Optional[str] = None
    passPercentage: Optional[int] = 50
    questions: Optional[List[str]] = None
    meetingLink: Optional[str] = None

@router.post("/api/generate-questions")
async def generate_questions(request: QuestionGenerationRequest):
    """Generate 50 technical questions based on user prompt and language"""
    try:
        generation_prompt = f"""
        Generate exactly 50 technical interview questions for {request.language} programming language.
        
        Focus on: {request.prompt}
        
        Requirements:
        - Mix of theory, practical coding, and problem-solving questions
        - Appropriate difficulty for technical interviews
        - Clear, concise questions that can be answered verbally
        - Cover fundamentals, advanced concepts, and real-world scenarios
        - No code blocks in questions, just descriptive questions
        
        Return as a numbered list of exactly 50 questions.
        """
        
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": generation_prompt}]
        )
        
        response_text = completion.choices[0].message.content
        
        # Parse the questions from the response
        questions = []
        lines = response_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('*')):
                # Clean up the question text
                question = line
                # Remove numbering patterns
                import re
                question = re.sub(r'^\d+\.?\s*', '', question)
                question = re.sub(r'^[-*]\s*', '', question)
                question = question.strip()
                
                if question and len(question) > 10:  # Valid question
                    questions.append(question)
        
        # Ensure we have at least some questions
        if len(questions) < 20:
            return {
                "success": False, 
                "error": f"Only generated {len(questions)} questions. Please try with a more specific prompt."
            }
        
        # Take up to 50 questions
        questions = questions[:50]
        
        return {
            "success": True,
            "questions": questions,
            "count": len(questions)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate questions: {str(e)}"
        }

@router.post("/api/setup-interview")
async def setup_interview(request: InterviewSetupRequest):
    """Setup interview configuration and make the call"""
    try:
        # Validate phone number format - phone number is required
        phone = request.phoneNumber.strip()
        if not phone:
            return {"success": False, "error": "Phone number is required"}
        if not phone.startswith('+'):
            phone = '+' + phone
            
        # Set default values
        language = request.language or "JavaScript"
        custom_prompt = request.customPrompt or f"General technical interview questions for {language}"
        
        # Auto-generate questions if none provided
        questions = request.questions or []
        if not questions:
            try:
                # Generate questions automatically
                generation_prompt = f"""
                Generate exactly 50 technical interview questions for {language} programming language.
                
                Focus on: {custom_prompt}
                
                Requirements:
                - Mix of theory, practical coding, and problem-solving questions
                - Appropriate difficulty for technical interviews
                - Clear, concise questions that can be answered verbally
                - Cover fundamentals, advanced concepts, and real-world scenarios
                - No code blocks in questions, just descriptive questions
                
                Return as a numbered list of exactly 50 questions.
                """
                
                completion = openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": generation_prompt}]
                )
                
                response_text = completion.choices[0].message.content
                
                # Parse the questions from the response
                generated_questions = []
                lines = response_text.strip().split('\n')
                
                for line in lines:
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-') or line.startswith('*')):
                        # Clean up the question text
                        question = line
                        # Remove numbering patterns
                        import re
                        question = re.sub(r'^\d+\.?\s*', '', question)
                        question = re.sub(r'^[-*]\s*', '', question)
                        question = question.strip()
                        
                        if question and len(question) > 10:  # Valid question
                            generated_questions.append(question)
                
                # Use generated questions if we got at least some
                if len(generated_questions) >= 20:
                    questions = generated_questions[:50]  # Take up to 50 questions
                    print(f"Auto-generated {len(questions)} questions for {language}")
                else:
                    print(f"Failed to generate enough questions, falling back to default JS questions")
                    questions = JS_QUESTIONS
                    
            except Exception as e:
                print(f"Error auto-generating questions: {str(e)}, falling back to default JS questions")
                questions = JS_QUESTIONS
        
        # Ensure we always have questions
        if not questions or len(questions) == 0:
            print("WARNING: No questions available, using default JS questions as final fallback")
            questions = JS_QUESTIONS
            
        print(f"Final questions count: {len(questions)}")
        
        # Create interview configuration with defaults
        config = {
            "email": request.email or "candidate@example.com",
            "language": language, 
            "customPrompt": custom_prompt,
            "yoe": request.yoe or "2-3",
            "passPercentage": request.passPercentage or 50,
            "questions": questions,
            "meetingLink": request.meetingLink or "https://cal.com/gautam-tayal/sync"
        }
        
        # Generate a unique interview ID
        import uuid
        interview_id = str(uuid.uuid4())
        
        # Store configuration in both places for now
        interview_configs[interview_id] = config
        
        # Also store in interview service
        from app.services.interview_service import set_interview_config
        set_interview_config(interview_id, config)
        
        # Make the call with interview_id as parameter
        call = twilio_client.calls.create(
            to=phone,
            from_=TWILIO_PHONE_NUMBER,
            url=f"https://{DOMAIN}/outbound-twiml?interview_id={interview_id}",
            method="POST"
        )
        
        return {
            "success": True,
            "call_sid": call.sid,
            "interview_id": interview_id,
            "message": f"Interview call initiated to {phone}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to setup interview: {str(e)}"
        }

@router.get("/api/interview-config/{interview_id}")
async def get_interview_config(interview_id: str):
    """Get interview configuration by ID"""
    config = interview_configs.get(interview_id)
    if not config:
        raise HTTPException(status_code=404, detail="Interview configuration not found")
    
    return {"success": True, "config": config}

@router.get("/setup")
async def serve_setup_page():
    """Serve the interview setup page"""
    from fastapi.responses import HTMLResponse
    import os
    
    # Read the HTML file content
    static_path = os.path.join("static", "interview-setup.html")
    try:
        with open(static_path, 'r') as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=200)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Setup page not found</h1>", status_code=404)