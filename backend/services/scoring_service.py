"""Service for scoring interview answers using OpenAI API"""

from openai import OpenAI
from config import OPENAI_API_KEY

openai = OpenAI(api_key=OPENAI_API_KEY)

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
    except Exception as e:
        print(f"Error scoring answer: {e}")
        return 5  # Default score if API fails