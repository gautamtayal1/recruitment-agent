from fastapi import FastAPI, Request, Form
from twilio.twiml import VoiceResponse
from twilio.rest import Client
import os
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI(title="Recruiter Agent", description="Voice recruitment screening agent")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.get("/")
async def root():
    return {"message": "Recruiter Agent API is running"}

@app.post("/voice/incoming")
async def handle_incoming_call(request: Request):
    """Handle incoming voice calls from Twilio"""
    response = VoiceResponse()
    
    # Greet the caller and start recording
    response.say("Hello! Welcome to our recruitment screening. Please state your name and the position you're applying for.")
    
    # Start recording and gather speech input
    response.record(
        action="/voice/process",
        method="POST",
        max_length=30,
        finish_on_key="#",
        transcribe=True,
        transcribe_callback="/voice/transcription"
    )
    
    return response

@app.post("/voice/process")
async def process_recording(request: Request, RecordingUrl: str = Form(None)):
    """Process the recorded audio and continue conversation"""
    response = VoiceResponse()
    
    # Placeholder for LLM processing
    # TODO: Process the recording, send to LLM, get response
    llm_response = await process_with_llm(RecordingUrl)
    
    # Speak the LLM response
    response.say(llm_response)
    
    # Continue conversation or end call
    response.record(
        action="/voice/continue",
        method="POST",
        max_length=30,
        finish_on_key="#",
        transcribe=True,
        transcribe_callback="/voice/transcription"
    )
    
    return response

@app.post("/voice/continue")
async def continue_conversation(request: Request, RecordingUrl: str = Form(None)):
    """Continue the conversation flow"""
    response = VoiceResponse()
    
    # Placeholder for continued LLM processing
    llm_response = await process_with_llm(RecordingUrl)
    
    if should_end_call(llm_response):
        response.say("Thank you for your time. We'll be in touch soon. Goodbye!")
        response.hangup()
    else:
        response.say(llm_response)
        response.record(
            action="/voice/continue",
            method="POST",
            max_length=30,
            finish_on_key="#",
            transcribe=True,
            transcribe_callback="/voice/transcription"
        )
    
    return response

@app.post("/voice/transcription")
async def handle_transcription(request: Request, TranscriptionText: str = Form(None)):
    """Handle transcription callbacks from Twilio"""
    print(f"Transcription received: {TranscriptionText}")
    # Store transcription for processing
    return {"status": "received"}

async def process_with_llm(recording_url: str) -> str:
    """
    Placeholder function for LLM processing
    TODO: Implement your LLM logic here
    
    This function should:
    1. Download the recording from recording_url
    2. Convert speech to text if needed
    3. Send text to your LLM
    4. Get response from LLM
    5. Return the response text
    """
    return "Thank you for sharing that information. Can you tell me about your relevant experience?"

def should_end_call(llm_response: str) -> bool:
    """
    Placeholder function to determine if call should end
    TODO: Implement your logic here
    """
    return False

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
