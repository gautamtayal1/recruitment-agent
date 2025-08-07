"""WebSocket handler for conversation relay"""

import json
import hmac
import hashlib
import base64
from fastapi import WebSocket, WebSocketDisconnect
from config import TWILIO_AUTH_TOKEN, DOMAIN, SYSTEM_PROMPT
from services.interview_service import initialize_interview, process_answer, interview_sessions

# Store active sessions
sessions = {}

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
    """Handle JavaScript interview conversation"""
    if not call_sid or call_sid not in interview_sessions:
        # Initialize new interview session
        return initialize_interview(call_sid)
    
    user_message = messages[-1].get('content', '') if messages else ''
    return await process_answer(call_sid, user_message)

async def handle_websocket_connection(websocket: WebSocket):
    """Handle WebSocket connection for conversation relay"""
    
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
        print(f"WebSocket connection closed for call: {call_sid}")
        if call_sid:
            sessions.pop(call_sid, None)
            # Mark interview as ended if it exists
            if call_sid in interview_sessions:
                print(f"Interview session ended for {call_sid}")
                del interview_sessions[call_sid]