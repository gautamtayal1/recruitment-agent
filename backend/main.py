import os
import json
import uvicorn
import hmac
import hashlib
import base64
import time
from urllib.parse import urlparse
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
PORT = int(os.getenv("PORT", "8080"))
DOMAIN = os.getenv("NGROK_URL")
WS_URL = f"wss://{DOMAIN}/ws"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
WELCOME_GREETING = "Hi! I am a recruitment screening assistant. Please tell me your name and the position you're applying for!"
SYSTEM_PROMPT = "You are a recruitment screening assistant. This conversation is being translated to voice, so answer carefully. When you respond, please spell out all numbers, for example twenty not 20. Do not include emojis in your responses. Do not include bullet points, asterisks, or special symbols. Ask relevant questions about the candidate's experience, qualifications, and fit for the role."

# Initialize OpenAI client
openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Twilio client
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Store active sessions and conversation control
sessions = {}
conversation_control = {}  # Store conversation state for manual control

# Create FastAPI app
app = FastAPI()

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3002", "http://127.0.0.1:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_twilio_signature(signature, url, auth_token):
    """Validate Twilio signature for WebSocket security"""
    if not signature or not auth_token:
        return False
    
    try:
        # Create the signature
        expected_signature = base64.b64encode(
            hmac.new(
                auth_token.encode('utf-8'),
                url.encode('utf-8'),
                hashlib.sha1
            ).digest()
        ).decode('utf-8')
        
        # Compare signatures
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        print(f"Signature validation error: {e}")
        return False

async def ai_response(messages, call_sid=None):
    """Get a response from OpenAI API or manual control"""
    
    # Check if this call is under manual control
    if call_sid and call_sid in conversation_control:
        control = conversation_control[call_sid]
        
        # If there's a pending response from the operator, use it
        if control.get('pending_response'):
            response = control['pending_response']
            control['pending_response'] = None
            control['waiting_for_response'] = False
            return response
        
        # If waiting for operator response, store the user message and return holding response
        if control.get('waiting_for_response'):
            return "Please hold on while I check that for you..."
        
        # Store user input for operator to see
        if messages and len(messages) > 0:
            user_message = messages[-1].get('content', '')
            control['last_user_message'] = user_message
            control['waiting_for_response'] = True
            control['conversation_log'] = messages
            
        return "Thank you for that information. Let me process that for you..."
    
    # Default AI response
    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    return completion.choices[0].message.content

@app.post("/make-call")
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

@app.post("/outbound-twiml")
async def outbound_twiml_endpoint():
    """TwiML for outbound calls - connects to ConversationRelay"""
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>Hello! I'm your AI recruitment assistant. Please hold while I connect you.</Say>
      <Connect>
        <ConversationRelay url="{WS_URL}" welcomeGreeting="{WELCOME_GREETING}" />
      </Connect>
    </Response>"""
    
    return Response(content=xml_response, media_type="text/xml")

@app.post("/enable-control/{call_sid}")
async def enable_manual_control(call_sid: str):
    """Enable manual control for a specific call"""
    conversation_control[call_sid] = {
        'waiting_for_response': False,
        'last_user_message': '',
        'pending_response': None,
        'conversation_log': [],
        'enabled': True
    }
    return {"success": True, "message": f"Manual control enabled for call {call_sid}"}

@app.get("/get-conversation/{call_sid}")
async def get_conversation_state(call_sid: str):
    """Get the current conversation state for a call"""
    if call_sid in conversation_control:
        control = conversation_control[call_sid]
        return {
            "success": True,
            "call_sid": call_sid,
            "waiting_for_response": control.get('waiting_for_response', False),
            "last_user_message": control.get('last_user_message', ''),
            "conversation_log": control.get('conversation_log', [])
        }
    return {"success": False, "message": "Call not found or not under manual control"}

@app.post("/send-response/{call_sid}")
async def send_manual_response(call_sid: str, response: str = Form(...)):
    """Send a manual response for a call"""
    if call_sid in conversation_control:
        conversation_control[call_sid]['pending_response'] = response
        return {"success": True, "message": "Response queued"}
    return {"success": False, "message": "Call not found or not under manual control"}

@app.get("/active-calls")
async def get_active_calls():
    """Get all active calls under manual control"""
    active_calls = []
    for call_sid, control in conversation_control.items():
        if control.get('enabled'):
            active_calls.append({
                "call_sid": call_sid,
                "waiting_for_response": control.get('waiting_for_response', False),
                "last_user_message": control.get('last_user_message', ''),
                "has_pending_response": bool(control.get('pending_response'))
            })
    return {"success": True, "active_calls": active_calls}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication with signature validation"""
    
    # Validate Twilio signature for security
    if TWILIO_AUTH_TOKEN:
        signature = websocket.headers.get("X-Twilio-Signature")
        full_url = f"wss://{DOMAIN}/ws"
        
        if not validate_twilio_signature(signature, full_url, TWILIO_AUTH_TOKEN):
            print("Invalid Twilio signature - connection rejected")
            await websocket.close(code=1008, reason="Invalid signature")
            return
        else:
            print("Twilio signature validated successfully")
    else:
        print("Warning: TWILIO_AUTH_TOKEN not set - skipping signature validation")
    
    await websocket.accept()
    call_sid = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "setup":
                call_sid = message["callSid"]
                print(f"Setup for call: {call_sid}")
                websocket.call_sid = call_sid
                sessions[call_sid] = [{"role": "system", "content": SYSTEM_PROMPT}]
                
            elif message["type"] == "prompt":
                print(f"Processing prompt: {message['voicePrompt']}")
                conversation = sessions[websocket.call_sid]
                conversation.append({"role": "user", "content": message["voicePrompt"]})
                
                response = await ai_response(conversation, websocket.call_sid)
                conversation.append({"role": "assistant", "content": response})
                
                await websocket.send_text(
                    json.dumps({
                        "type": "text",
                        "token": response,
                        "last": True
                    })
                )
                print(f"Sent response: {response}")
                
            elif message["type"] == "interrupt":
                print("Handling interruption.")
                
            else:
                print(f"Unknown message type received: {message['type']}")
                
    except WebSocketDisconnect:
        print("WebSocket connection closed")
        if call_sid:
            sessions.pop(call_sid, None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
    print(f"Server running at http://localhost:{PORT} and {WS_URL}")
