"""Routes for handling call-related endpoints"""

from fastapi import APIRouter, Form
from fastapi.responses import Response
from twilio.rest import Client
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DOMAIN, WS_URL, WELCOME_GREETING

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
    """TwiML for outbound calls - connects to ConversationRelay"""
    interview_intro = "Welcome to your JavaScript technical interview! Here's how it works: I will ask you 10 random JavaScript questions. Please answer each question to the best of your ability. Each answer will be scored from 1 to 10 based on accuracy and completeness. Take your time to think before answering. Let's begin!"
    
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <ConversationRelay url="{WS_URL}" welcomeGreeting="{interview_intro}" />
      </Connect>
    </Response>"""
    
    return Response(content=xml_response, media_type="text/xml")