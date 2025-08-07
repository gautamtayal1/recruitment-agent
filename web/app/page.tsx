'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('+919991422233');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<any[]>([]);

  const makeCall = () => {
    setLoading(true);
    setMessage('Calling...');
    
    fetch('http://localhost:8080/make-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `phone_number=${phoneNumber}`
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setCallHistory([...callHistory, {
          number: phoneNumber,
          status: 'Calling',
          time: new Date().toLocaleTimeString(),
          call_sid: data.call_sid
        }]);
        
        // Start monitoring interview
        monitorInterview(data.call_sid);
      } else {
        setMessage(`❌ ${data.error}`);
      }
      setLoading(false);
    })
    .catch(() => {
      setMessage('❌ Network error');
      setLoading(false);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      makeCall();
    }
  };

  const monitorInterview = (callSid: string) => {
    // Start monitoring this interview session
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/interview-status/${callSid}`);
        const data = await response.json();
        if (data.success) {
          // Update or add interview session
          setInterviewSessions(prev => {
            const existing = prev.find(session => session.call_sid === callSid);
            if (existing) {
              return prev.map(session => 
                session.call_sid === callSid 
                  ? { ...session, ...data }
                  : session
              );
            } else {
              return [...prev, data];
            }
          });
        } else {
          // Interview ended or not found, stop monitoring
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to fetch interview status:', error);
      }
    }, 2000); // Check every 2 seconds

    // Clean up interval after 20 minutes (max interview time)
    setTimeout(() => clearInterval(interval), 20 * 60 * 1000);
  };

  const clearAllCalls = () => {
    setInterviewSessions([]);
    setCallHistory([]);
    setMessage('✅ All interviews cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🤖 AI Recruiter Agent
            </h1>
            <p className="text-gray-600">
              Make outbound calls to candidates for recruitment screening
            </p>
            <div className="mt-4">
              <a 
                href="/setup" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                ⚙️ Custom Interview Setup
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Include country code (e.g., +1 for US, +91 for India)
              </p>
            </div>

            <button
              onClick={makeCall}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg text-lg"
              disabled={loading}
            >
              {loading ? 'Calling...' : '📞 MAKE CALL'}
            </button>

            {(interviewSessions.length > 0 || callHistory.length > 0) && (
              <button
                onClick={clearAllCalls}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
              >
                🗑️ Clear All Interviews
              </button>
            )}

            {message && (
              <div className={`p-4 rounded-lg text-center font-medium ${
                message.startsWith('✅') 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>

          {callHistory.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Calls</h2>
              <div className="space-y-2">
                {callHistory.slice(-5).reverse().map((call, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{call.number}</span>
                    <span className="text-sm text-gray-600">{call.time}</span>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {call.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {interviewSessions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Live Interviews</h2>
              <div className="space-y-4">
                {interviewSessions.map((session) => (
                  <div key={session.call_sid} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-sm font-medium text-green-800">
                          Interview ID: {session.call_sid.slice(-8)}
                        </span>
                        <div className="text-xs text-green-600 mt-1">
                          Question {session.questions_asked}/10 • Average Score: {session.average_score.toFixed(1)}/10
                        </div>
                      </div>
                      {session.waiting_for_answer && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          🎤 Answering...
                        </span>
                      )}
                    </div>

                    {session.current_question && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">❓ Current Question:</p>
                        <p className="p-2 bg-white rounded text-sm border">{session.current_question}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-2 rounded border">
                        <div className="font-medium text-gray-700">Progress</div>
                        <div className="text-lg font-bold text-green-600">
                          {session.questions_asked}/10
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-medium text-gray-700">Total Score</div>
                        <div className="text-lg font-bold text-green-600">
                          {session.total_score}/{session.questions_asked * 10}
                        </div>
                      </div>
                    </div>

                    {session.scores.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 mb-1">Individual Scores:</p>
                        <div className="flex flex-wrap gap-1">
                          {session.scores.map((score: number, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 text-xs rounded ${
                                score >= 8 ? 'bg-green-100 text-green-800' :
                                score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              Q{idx + 1}: {score}/10
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Enter a phone number and click &quot;Make Call&quot;</li>
              <li>AI conducts JavaScript interview with 10 random questions</li>
              <li>Each answer is scored 1-10 by OpenAI automatically</li>
              <li>Real-time progress tracking shows scores and questions</li>
              <li>Final results with average score provided at end</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
