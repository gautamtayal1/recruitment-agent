"""Service for managing interview sessions and logic"""

import random
from typing import Dict, Any
from questions import JS_QUESTIONS
from services.scoring_service import score_answer

# Store interview sessions
interview_sessions: Dict[str, Dict[str, Any]] = {}

def initialize_interview(call_sid: str) -> str:
    """Initialize a new interview session"""
    question = random.choice(JS_QUESTIONS)
    interview_sessions[call_sid] = {
        'questions_asked': 1,
        'total_score': 0,
        'current_question': question,
        'used_questions': [question],
        'scores': [],
        'waiting_for_answer': True
    }
    
    return f"Question 1: {question}"

async def process_answer(call_sid: str, user_message: str) -> str:
    """Process user's answer and return next question or results"""
    if call_sid not in interview_sessions:
        return initialize_interview(call_sid)
    
    session = interview_sessions[call_sid]
    
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
            total_percentage = (session['total_score'] / 100) * 100
            
            if total_percentage >= 50:
                final_message = f"Thank you! That completes your interview. Congratulations! You've performed well. You will receive a link to book a final interview within 24 hours. Goodbye!"
            else:
                final_message = f"Thank you! That completes your interview. We appreciate your time. We'll be in touch soon. Goodbye!"
            
            # Clean up session
            del interview_sessions[call_sid]
            return final_message
        
        # Ask next question
        available_questions = [q for q in JS_QUESTIONS if q not in session['used_questions']]
        if available_questions:
            next_question = random.choice(available_questions)
            session['current_question'] = next_question
            session['used_questions'].append(next_question)
            session['waiting_for_answer'] = True
            session['questions_asked'] += 1
            
            return f"Thank you. Here's question {session['questions_asked']}: {next_question}"
        else:
            # Fallback if we run out of questions
            total_percentage = (session['total_score'] / (len(session['scores']) * 10)) * 100
            if total_percentage >= 50:
                final_message = f"Thank you! That completes your interview. Congratulations! You've performed well. You will receive a link to book a final interview within 24 hours. Goodbye!"
            else:
                final_message = f"Thank you! That completes your interview. We appreciate your time. We'll be in touch soon. Goodbye!"
            del interview_sessions[call_sid]
            return final_message
    
    # If user says something unexpected
    if session['current_question']:
        return f"Please answer the current question: {session['current_question']}"
    else:
        return "Let me ask you a JavaScript question. Please wait a moment."

def get_interview_status(call_sid: str) -> Dict[str, Any]:
    """Get current interview status"""
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

def end_interview(call_sid: str) -> Dict[str, Any]:
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