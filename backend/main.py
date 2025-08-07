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

# Store active sessions and interview state
sessions = {}
interview_sessions = {}  # Store interview progress for each call

# JavaScript Interview Questions
JS_QUESTIONS = [
    "What is the difference between let, var, and const in JavaScript?",
    "Explain event bubbling and event capturing in JavaScript.",
    "What are closures in JavaScript and how do they work?",
    "What is the difference between == and === in JavaScript?",
    "Explain the concept of hoisting in JavaScript.",
    "What are JavaScript promises and how do they work?",
    "What is the difference between function declarations and function expressions?",
    "Explain the 'this' keyword in JavaScript.",
    "What are JavaScript prototypes and prototype chain?",
    "What is event delegation in JavaScript?",
    "Explain the difference between synchronous and asynchronous JavaScript.",
    "What are JavaScript callbacks and callback hell?",
    "What is the JavaScript event loop?",
    "Explain the concept of scope in JavaScript.",
    "What are JavaScript arrow functions and how are they different from regular functions?",
    "What is destructuring in JavaScript?",
    "Explain the concept of modules in JavaScript.",
    "What are JavaScript generators?",
    "What is the difference between null and undefined?",
    "Explain the concept of inheritance in JavaScript.",
    "What are JavaScript higher-order functions?",
    "What is the difference between call, apply, and bind methods?",
    "Explain the concept of currying in JavaScript.",
    "What are JavaScript template literals?",
    "What is the spread operator in JavaScript?",
    "Explain the concept of debouncing and throttling.",
    "What are JavaScript Web APIs?",
    "What is the difference between localStorage and sessionStorage?",
    "Explain the concept of CORS in JavaScript.",
    "What are JavaScript regular expressions?",
    "What is the difference between map, filter, and reduce methods?",
    "Explain the concept of memoization in JavaScript.",
    "What are JavaScript classes and how do they work?",
    "What is the difference between setTimeout and setInterval?",
    "Explain the concept of strict mode in JavaScript.",
    "What are JavaScript symbols?",
    "What is the difference between deep copy and shallow copy?",
    "Explain the concept of JavaScript engines.",
    "What are JavaScript iterators and iterables?",
    "What is the difference between Object.freeze() and Object.seal()?",
    "Explain the concept of JavaScript decorators.",
    "What are JavaScript mixins?",
    "What is the difference between function.call() and function.apply()?",
    "Explain the concept of JavaScript modules (ES6 modules).",
    "What are JavaScript getters and setters?",
    "What is the difference between for...in and for...of loops?",
    "Explain the concept of JavaScript error handling with try-catch.",
    "What are JavaScript typed arrays?",
    "What is the difference between Object.create() and new Object()?",
    "Explain the concept of JavaScript weak references (WeakMap, WeakSet)."
]

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

async def score_answer(question: str, answer: str) -> int:
    """Score an answer using OpenAI API"""
    scoring_prompt = f"""
    Please rate this JavaScript interview answer on a scale of 1-10, where:
    1-3 = Poor (incorrect, incomplete, or demonstrates lack of understanding)
    4-6 = Average (partially correct, basic understanding)
    7-8 = Good (mostly correct, good understanding)
    9-10 = Excellent (comprehensive, demonstrates deep understanding)

    Question: {question}
    
    Answer: {answer}
    
    Please respond with only a number from 1-10, nothing else.
    """
    
    try:
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": scoring_prompt}]
        )
        score_text = completion.choices[0].message.content.strip()
        # Extract number from response
        score = int(''.join(filter(str.isdigit, score_text)))
        return max(1, min(10, score))  # Ensure score is between 1-10
    except:
        return 5  # Default score if API fails

async def ai_response(messages, call_sid=None):
    """Handle JavaScript interview conversation"""
    import random
    
    if not call_sid or call_sid not in interview_sessions:
        # Initialize new interview session
        if call_sid:
            interview_sessions[call_sid] = {
                'questions_asked': 0,
                'total_score': 0,
                'current_question': None,
                'used_questions': [],
                'scores': [],
                'waiting_for_answer': False
            }
        
        # Ask first question
        question = random.choice(JS_QUESTIONS)
        if call_sid:
            interview_sessions[call_sid]['current_question'] = question
            interview_sessions[call_sid]['used_questions'].append(question)
            interview_sessions[call_sid]['waiting_for_answer'] = True
            interview_sessions[call_sid]['questions_asked'] = 1
        
        return f"Hello! Welcome to your JavaScript technical interview. I'll ask you 10 random questions. Let's start with question 1: {question}"
    
    session = interview_sessions[call_sid]
    user_message = messages[-1].get('content', '') if messages else ''
    
    # If we're waiting for an answer to current question
    if session['waiting_for_answer'] and session['current_question']:
        # Score the answer
        score = await score_answer(session['current_question'], user_message)
        session['scores'].append(score)
        session['total_score'] += score
        session['waiting_for_answer'] = False
        
        print(f"Question: {session['current_question']}")
        print(f"Answer: {user_message}")
        print(f"Score: {score}/10")
        
        # Check if interview is complete
        if session['questions_asked'] >= 10:
            avg_score = session['total_score'] / 10
            return f"Thank you! That completes your interview. Your average score is {avg_score:.1f} out of 10. Individual scores were: {', '.join(map(str, session['scores']))}. We'll be in touch soon. Goodbye!"
        
        # Ask next question
        available_questions = [q for q in JS_QUESTIONS if q not in session['used_questions']]
        if available_questions:
            next_question = random.choice(available_questions)
            session['current_question'] = next_question
            session['used_questions'].append(next_question)
            session['waiting_for_answer'] = True
            session['questions_asked'] += 1
            
            return f"Great! Your score for that question was {score} out of 10. Here's question {session['questions_asked']}: {next_question}"
        else:
            # Fallback if we run out of questions
            avg_score = session['total_score'] / len(session['scores'])
            return f"That completes your interview! Your average score is {avg_score:.1f} out of 10. We'll be in touch soon."
    
    # If user says something unexpected
    if session['current_question']:
        return f"Please answer the current question: {session['current_question']}"
    else:
        return "Let me ask you a JavaScript question. Please wait a moment."

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

@app.get("/interview-status/{call_sid}")
async def get_interview_status(call_sid: str):
    """Get the current interview status for a call"""
    if call_sid in interview_sessions:
        session = interview_sessions[call_sid]
        return {
            "success": True,
            "call_sid": call_sid,
            "questions_asked": session['questions_asked'],
            "total_score": session['total_score'],
            "average_score": session['total_score'] / max(1, len(session['scores'])),
            "current_question": session['current_question'],
            "scores": session['scores'],
            "waiting_for_answer": session['waiting_for_answer']
        }
    return {"success": False, "message": "Interview session not found"}

@app.post("/end-interview/{call_sid}")
async def end_interview(call_sid: str):
    """End interview session and get final results"""
    if call_sid in interview_sessions:
        session = interview_sessions[call_sid]
        final_results = {
            "call_sid": call_sid,
            "questions_asked": session['questions_asked'],
            "total_score": session['total_score'],
            "average_score": session['total_score'] / max(1, len(session['scores'])),
            "scores": session['scores']
        }
        # Clean up session
        del interview_sessions[call_sid]
        print(f"Interview ended for {call_sid}: {final_results}")
        return {"success": True, "results": final_results}
    return {"success": False, "message": "Interview session not found"}

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
        print(f"WebSocket connection closed for call: {call_sid}")
        if call_sid:
            sessions.pop(call_sid, None)
            # Mark call as ended in conversation control
            if call_sid in conversation_control:
                conversation_control[call_sid]['enabled'] = False

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
    print(f"Server running at http://localhost:{PORT} and {WS_URL}")
