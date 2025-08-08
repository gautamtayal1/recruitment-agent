'use client';

import React, { useState } from 'react';

interface CallHistoryItem {
  number: string;
  status: string;
  time: string;
  call_sid: string;
}


export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('+919991422233');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);

  const makeCall = () => {
    setLoading(true);
    setMessage('Calling...');
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/make-call`, {
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/interview-status/${callSid}`);
        const data = await response.json();
        if (!data.success) {
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


  const submitQuickStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Setting up questions...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/setup-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, email }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setCallHistory([
          ...callHistory,
          {
            number: phoneNumber,
            status: 'Calling',
            time: new Date().toLocaleTimeString(),
            call_sid: data.call_sid,
          },
        ]);
        monitorInterview(data.call_sid);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Marketing Hero */}
      <section className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 flex justify-center">
          <div className="h-56 w-[44rem] bg-accent/20 blur-3xl rounded-full" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border border-[#E6E6E7] dark:border-white/10 mb-4 bg-accent/10 text-accent">
          <span>AI Agents for Hiring</span>
          <span className="opacity-60">•</span>
          <span>Voice + Auto‑Scoring</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Build and run
          <span className="mx-2 bg-clip-text text-transparent bg-gradient-to-r from-[rgb(var(--accent))] to-[color-mix(in_oklab,_rgb(var(--accent))_70%,_white)]">AI interview agents</span>
          in minutes
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Phone interviews that call candidates, ask questions, and score answers — automatically.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/setup" className="btn btn-primary">Start free</a>
          <a href="#quickstart" className="btn btn-secondary">Quick start</a>
        </div>
      </section>

      {/* Quick Start (full-width band) */}
      <section id="quickstart" className="relative -mx-4 px-4">
        <div className="mx-auto max-w-7xl py-6 card text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Start an interview now</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Enter a phone number and we’ll place the call.</p>
            </div>
            <div className="text-2xl">📞</div>
          </div>
          <form onSubmit={submitQuickStart} className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="input rounded-full h-12 px-4 text-base"
              disabled={loading}
              required
            />
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="+1 (555) 000-0000"
              className="input rounded-full h-12 px-4 text-base"
              disabled={loading}
              required
            />
            <button type="submit" disabled={loading} className="btn btn-primary rounded-full h-12 px-6 md:min-w-40">{loading ? 'Calling…' : 'Start call'}</button>
          </form>
          {message && (
            <div className={`mt-3 rounded-md px-3 py-2 text-sm ${message.startsWith('✅') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'}`}>
              {message}
            </div>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card text-left">
          <div className="text-2xl mb-2">📞</div>
          <h3 className="font-semibold mb-1">Voice Calls</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Agents dial candidates and conduct interviews over the phone.</p>
        </div>
        <div className="card text-left">
          <div className="text-2xl mb-2">🧠</div>
          <h3 className="font-semibold mb-1">Auto‑Scoring</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Answers are scored in real‑time with consistent rubrics.</p>
        </div>
        <div className="card text-left">
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="font-semibold mb-1">Custom Prompts</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Tailor interviews by language, focus areas, and difficulty.</p>
        </div>
        <div className="card text-left">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-1">Clear Results</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">See progress, scores, and pass thresholds at a glance.</p>
        </div>
      </section>

      

      {/* Bottom CTA */}
      <section className="card text-center">
        <h3 className="text-xl font-semibold">Ready to interview faster?</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Spin up an AI interview agent in minutes and start calling.</p>
        <div className="mt-4 flex justify-center gap-3">
          <a href="/setup" className="btn btn-primary">Create an agent</a>
          <a href="#quickstart" className="btn btn-secondary">Quick start</a>
        </div>
      </section>
      
    </div>
  );
}
