"""Service for sending emails via Gmail SMTP"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import GMAIL_USER, GMAIL_PASSWORD


def send_interview_selection_email(candidate_email: str, candidate_name: str = "Candidate", scheduling_link: str = None) -> bool:
    """
    Send interview selection email to successful candidate
    
    Args:
        candidate_email (str): Candidate's email address
        candidate_name (str): Candidate's name (optional)
        scheduling_link (str): Link to schedule the final interview
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = candidate_email
        msg['Subject'] = "Congratulations! You've been selected for the next interview round"
        
        # Create scheduling section based on whether link is provided
        if scheduling_link:
            scheduling_section = f"""
Next Steps:
• Click here to schedule your final interview: {scheduling_link}
• The final interview will be conducted by our technical team
• Please prepare for discussions about your experience and technical projects
• Choose a time that works best for you from the available slots

Schedule your interview now: {scheduling_link}
"""
        else:
            scheduling_section = """
Next Steps:
• You will receive a calendar invitation within 24 hours to schedule your final interview
• The final interview will be conducted by our technical team
• Please prepare for discussions about your experience and technical projects
"""

        # Email body
        body = f"""
Dear {candidate_name},

Congratulations! We are pleased to inform you that you have successfully passed the technical screening interview.

Based on your performance, we would like to invite you to proceed to the next round of our interview process. Your technical knowledge and problem-solving skills impressed our evaluation team.
{scheduling_section}
We look forward to speaking with you soon and learning more about your background.

Best regards,
The Recruitment Team

---
This is an automated message. Please do not reply to this email.
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Gmail SMTP server setup
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Enable encryption
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(GMAIL_USER, candidate_email, text)
        server.quit()
        
        print(f"Interview selection email sent successfully to {candidate_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {candidate_email}: {str(e)}")
        return False


def send_interview_rejection_email(candidate_email: str, candidate_name: str = "Candidate") -> bool:
    """
    Send interview rejection email to unsuccessful candidate
    
    Args:
        candidate_email (str): Candidate's email address
        candidate_name (str): Candidate's name (optional)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = candidate_email
        msg['Subject'] = "Thank you for your interest - Interview Update"
        
        # Email body
        body = f"""
Dear {candidate_name},

Thank you for taking the time to participate in our technical screening interview.

After careful evaluation of your responses, we have decided not to move forward with your application at this time. While your background shows promise, we have chosen to proceed with candidates whose experience more closely aligns with our current requirements.

We appreciate your interest in our company and encourage you to apply for future positions that match your skills and experience.

We wish you all the best in your job search and future endeavors.

Best regards,
The Recruitment Team

---
This is an automated message. Please do not reply to this email.
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Gmail SMTP server setup
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Enable encryption
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(GMAIL_USER, candidate_email, text)
        server.quit()
        
        print(f"Interview rejection email sent successfully to {candidate_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {candidate_email}: {str(e)}")
        return False


def send_interview_incomplete_email(candidate_email: str, candidate_name: str = "Candidate", questions_answered: int = 0) -> bool:
    """
    Send email to candidate whose interview was disconnected/incomplete
    
    Args:
        candidate_email (str): Candidate's email address
        candidate_name (str): Candidate's name (optional)
        questions_answered (int): Number of questions answered before disconnection
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = candidate_email
        msg['Subject'] = "Technical Interview - Connection Issue"
        
        # Email body
        body = f"""
Dear {candidate_name},

We noticed that your technical interview session was disconnected unexpectedly. This can happen due to network issues, call drops, or other technical problems.

Interview Status:
• Questions answered: {questions_answered} out of 10
• Session ended early due to connection loss

Next Steps:
If you would like to complete your interview, please reach out to us and we can schedule a new session. We understand that technical issues are beyond your control and we're happy to provide another opportunity.

You can reply to this email or contact us directly to reschedule.

We apologize for any inconvenience this may have caused.

Best regards,
The Recruitment Team

---
This is an automated message. You can reply to this email to reschedule your interview.
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Gmail SMTP server setup
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Enable encryption
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(GMAIL_USER, candidate_email, text)
        server.quit()
        
        print(f"Interview incomplete email sent successfully to {candidate_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send incomplete email to {candidate_email}: {str(e)}")
        return False