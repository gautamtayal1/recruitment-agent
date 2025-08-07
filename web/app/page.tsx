'use client';

import { useState } from 'react';

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [callHistory, setCallHistory] = useState<Array<{number: string, status: string, time: string}>>([]);

  const makeCall = async () => {
    if (!phoneNumber.trim()) {
      setMessage('Please enter a phone number');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8080/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `phone_number=${encodeURIComponent(phoneNumber)}`,
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setCallHistory(prev => [...prev, {
          number: phoneNumber,
          status: 'Calling...',
          time: new Date().toLocaleTimeString()
        }]);
        setPhoneNumber(''); // Clear input after successful call
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Failed to make call: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      makeCall();
    }
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
                onKeyPress={handleKeyPress}
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
              disabled={loading || !phoneNumber.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Making Call...
                </div>
              ) : (
                '📞 Make Call'
              )}
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

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Enter a phone number with country code</li>
              <li>Click "Make Call" to initiate outbound call</li>
              <li>The person will receive a call from your Twilio number</li>
              <li>When they answer, they'll be connected to the AI assistant</li>
              <li>The AI will conduct the recruitment screening</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
