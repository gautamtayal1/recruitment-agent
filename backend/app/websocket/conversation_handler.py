"""WebSocket handler for conversation relay"""

import json
import hmac
import hashlib
import base64
from fastapi import WebSocket, WebSocketDisconnect
from app.config import TWILIO_AUTH_TOKEN, DOMAIN, SYSTEM_PROMPT
from app.services.interview_service import initialize_interview, process_answer, interview_sessions
from app.services.email_service import send_interview_incomplete_email

# No sessions needed - direct control only

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

# AI response function removed - using direct interview control only

async def handle_websocket_connection(websocket: WebSocket):
    """Handle WebSocket connection for conversation relay"""
    
    # Extract interview_id from query parameters if present
    query_params = dict(websocket.query_params)
    interview_id = query_params.get("interview_id")
    print(f"WebSocket connection with interview_id: {interview_id}")
    
    # Temporarily disable signature validation for debugging
    print("DEBUG: Skipping signature validation to debug application error")
    # TODO: Re-enable signature validation after fixing the core issue
    
    await websocket.accept()
    call_sid = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"RECEIVED MESSAGE: {message}")
            
            if message["type"] == "setup":
                call_sid = message["callSid"]
                print(f"Setup for call: {call_sid}")
                websocket.call_sid = call_sid
                
                # Use the interview_id extracted from query parameters
                
                # NO SESSIONS - we control everything directly
                # Immediately send OUR welcome message and first question
                welcome_response = initialize_interview(call_sid, interview_id)
                await websocket.send_text(
                    json.dumps({
                        "type": "text", 
                        "token": welcome_response,
                        "last": True
                    })
                )
                print(f"Sent immediate welcome: {welcome_response}")
                
            elif message["type"] == "prompt":
                print(f"Processing prompt: {message['voicePrompt']}")
                
                # Process user's answer through interview logic
                response = await process_answer(websocket.call_sid, message['voicePrompt'])
                
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
        if call_sid and call_sid in interview_sessions:
            # Get session data before deletion
            session = interview_sessions[call_sid]
            questions_answered = len(session.get('scores', []))
            config = session.get('config', {})
            candidate_email = config.get('email')
            
            print(f"Interview session ended early for {call_sid} - {questions_answered} questions answered")
            
            # Send incomplete interview email if candidate email exists and interview was started
            if (candidate_email and 
                candidate_email != "candidate@example.com" and 
                questions_answered > 0 and 
                questions_answered < 10):
                
                success = send_interview_incomplete_email(candidate_email, "Candidate", questions_answered)
                if success:
                    print(f"Incomplete interview email sent to: {candidate_email}")
                else:
                    print(f"Failed to send incomplete interview email to: {candidate_email}")
            
            # Clean up session
            del interview_sessions[call_sid]