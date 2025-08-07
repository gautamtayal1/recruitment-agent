'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('+919991422233');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState('');
  const [operatorResponse, setOperatorResponse] = useState('');
  const [conversationView, setConversationView] = useState<any>(null);

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
        
        // Enable control
        fetch(`http://localhost:8080/enable-control/${data.call_sid}`, { method: 'POST' });
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

  const enableControlForCall = async (callSid: string) => {
    try {
      await fetch(`http://localhost:8080/enable-control/${callSid}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to enable control:', error);
    }
  };

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('http://localhost:8080/active-calls');
      const data = await response.json();
      if (data.success) {
        setActiveCalls(data.active_calls);
      }
    } catch (error) {
      console.error('Failed to fetch active calls:', error);
    }
  };

  const sendResponse = async () => {
    if (!selectedCall || !operatorResponse.trim()) return;

    try {
      await fetch(`http://localhost:8080/send-response/${selectedCall}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `response=${encodeURIComponent(operatorResponse)}`,
      });
      setOperatorResponse('');
      setMessage('✅ Response sent!');
    } catch (error) {
      console.error('Failed to send response:', error);
      setMessage('❌ Failed to send response');
    }
  };

  const fetchConversation = async (callSid: string) => {
    try {
      const response = await fetch(`http://localhost:8080/get-conversation/${callSid}`);
      const data = await response.json();
      if (data.success) {
        setConversationView(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  };

  // Poll for active calls every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchActiveCalls, 3000);
    return () => clearInterval(interval);
  }, []);

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
            >
              📞 MAKE CALL
            </button>

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

          {activeCalls.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🎙️ Live Call Control</h2>
              <div className="space-y-4">
                {activeCalls.map((call) => (
                  <div key={call.call_sid} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-medium text-yellow-800">Call ID: {call.call_sid.slice(-8)}</span>
                        {call.waiting_for_response && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            ⏳ Waiting for your response
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fetchConversation(call.call_sid)}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        View Full Chat
                      </button>
                    </div>
                    
                    {call.last_user_message && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">👤 Caller said:</p>
                        <p className="p-2 bg-gray-100 rounded text-sm">{call.last_user_message}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <textarea
                        value={selectedCall === call.call_sid ? operatorResponse : ''}
                        onChange={(e) => {
                          setSelectedCall(call.call_sid);
                          setOperatorResponse(e.target.value);
                        }}
                        placeholder="Type your response here..."
                        className="w-full p-2 border border-gray-300 rounded resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => {
                          setSelectedCall(call.call_sid);
                          sendResponse();
                        }}
                        disabled={!operatorResponse.trim() || selectedCall !== call.call_sid}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                      >
                        📤 Send Response
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conversationView && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Conversation Log</h3>
                <button
                  onClick={() => setConversationView(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversationView.conversation_log?.map((msg: any, idx: number) => (
                  <div key={idx} className={`p-2 rounded ${
                    msg.role === 'user' ? 'bg-blue-100 text-blue-800' : 
                    msg.role === 'assistant' ? 'bg-green-100 text-green-800' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="font-medium capitalize">{msg.role}: </span>
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Enter a phone number with country code</li>
              <li>Click &quot;Make Call&quot; to initiate outbound call</li>
              <li>The person will receive a call from your Twilio number</li>
              <li>When they answer, they&apos;ll be connected to the AI assistant</li>
              <li>The AI will conduct the recruitment screening</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
