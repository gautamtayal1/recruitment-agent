import os
from dotenv import load_dotenv

load_dotenv()

# Server Configuration
PORT = int(os.getenv("PORT", "8080"))
DOMAIN = os.getenv("NGROK_URL")
WS_URL = f"wss://{DOMAIN}/ws"

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Interview Configuration
WELCOME_GREETING = "Hi! I am a recruitment screening assistant. Please tell me your name and the position you're applying for!"
SYSTEM_PROMPT = "You are a recruitment screening assistant. This conversation is being translated to voice, so answer carefully. When you respond, please spell out all numbers, for example twenty not 20. Do not include emojis in your responses. Do not include bullet points, asterisks, or special symbols. Ask relevant questions about the candidate's experience, qualifications, and fit for the role."