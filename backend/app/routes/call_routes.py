"""Routes for handling call-related endpoints"""

from fastapi import APIRouter, Form
from fastapi.responses import Response
from twilio.rest import Client
from app.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DOMAIN, WS_URL, WELCOME_GREETING

router = APIRouter()
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@router.post("/make-call")
async def make_outbound_call(phone_number: str = Form(...)):
    """Make an outbound call to the specified number"""
    try:
        call = twilio_client.calls.create(
            to=phone_number,
            from_=TWILIO_PHONE_NUMBER,
            url=f"https://{DOMAIN}/outbound-twiml",
            method="POST"
        )
        
        return {
            "success": True,
            "call_sid": call.sid,
            "message": f"Calling {phone_number}..."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/outbound-twiml")
async def outbound_twiml_endpoint():
    """TwiML for outbound calls - uses ConversationRelay with proper control"""
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <ConversationRelay 
            url="{WS_URL}"
            welcomeGreeting=""
            welcomeGreetingInterruptible="none"
            interruptible="speech"
            reportInputDuringAgentSpeech="none"
            preemptible="false"
            dtmfDetection="true" />
      </Connect>
    </Response>"""
    
    return Response(content=xml_response, media_type="text/xml")

@router.post("/ask-question/{question_num}")
async def ask_question(question_num: int, CallSid: str = Form(...)):
    """Ask a specific question number"""
    from app.models.questions import JS_QUESTIONS
    import random
    
    # Get or create interview session
    from app.services.interview_service import interview_sessions
    
    if CallSid not in interview_sessions:
        # Initialize new session
        question = random.choice(JS_QUESTIONS)
        interview_sessions[CallSid] = {
            'questions_asked': 1,
            'total_score': 0,
            'current_question': question,
            'used_questions': [question],
            'scores': [],
            'waiting_for_answer': True
        }
    else:
        question = interview_sessions[CallSid]['current_question']
    
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>Question {question_num}: {question}</Say>
      <Record maxLength="60" timeout="5" transcribe="true" action="https://{DOMAIN}/process-answer/{question_num}" />
    </Response>"""
    
    return Response(content=xml_response, media_type="text/xml")

@router.post("/process-answer/{question_num}")  
async def process_answer_endpoint(question_num: int, CallSid: str = Form(...), TranscriptionText: str = Form("")):
    """Process the answer and move to next question"""
    from app.services.interview_service import process_answer, interview_sessions
    
    if not TranscriptionText:
        # No answer, ask again
        xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>I didn't hear your answer. Let me repeat the question.</Say>
          <Redirect>https://{DOMAIN}/ask-question/{question_num}</Redirect>
        </Response>"""
        return Response(content=xml_response, media_type="text/xml")
    
    # Process answer
    result = await process_answer(CallSid, TranscriptionText)
    
    # Check if interview is complete
    if CallSid not in interview_sessions:
        # Interview ended
        xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>{result}</Say>
          <Hangup/>
        </Response>"""
    else:
        # Continue to next question
        next_q = question_num + 1
        xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you.</Say>
          <Redirect>https://{DOMAIN}/ask-question/{next_q}</Redirect>
        </Response>"""
    
    return Response(content=xml_response, media_type="text/xml")