'use client'

import { useState } from 'react'
import Link from 'next/link'

interface InterviewConfig {
  phoneNumber: string
  email: string
  language: string
  customPrompt: string
  yoe: string
  passPercentage: number
  questions?: string[]
  meetingLink?: string
}

export default function InterviewSetup() {
  const [config, setConfig] = useState<InterviewConfig>({
    phoneNumber: '',
    email: '',
    language: 'JavaScript',
    customPrompt: '',
    yoe: '',
    passPercentage: 50,
    meetingLink: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const languages = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 
    'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'TypeScript'
  ]


  const submitInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setLoadingStep('Generating interview questions...')

    try {
      if (!config.phoneNumber.trim() || !config.email.trim()) {
        alert('Please provide both phone number and email')
        setIsSubmitting(false)
        setLoadingStep('')
        return
      }

      // Show generating questions step
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setLoadingStep('Setting up interview configuration...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await fetch('http://localhost:8080/api/setup-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const result = await response.json()
      
      if (result.success) {
        setLoadingStep('Initiating call...')
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Show success notification
        setSuccessMessage(`Interview setup complete! Call has been initiated to ${config.phoneNumber}. The candidate will receive the call shortly.`)
        setShowSuccess(true)
        
        // Reset form
        setConfig({
          phoneNumber: '',
          email: '',
          language: 'JavaScript',
          customPrompt: '',
          yoe: '',
          passPercentage: 50,
          meetingLink: ''
        })
        
        // Auto-hide success notification after 5 seconds
        setTimeout(() => {
          setShowSuccess(false)
        }, 5000)
      } else {
        alert('❌ Error: ' + result.error)
      }
    } catch (error) {
      alert('❌ Error: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
      setLoadingStep('')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Custom Interview Setup</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Create custom technical interviews with AI-powered question generation and real-time scoring.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/" className="btn btn-secondary">← Back to Dashboard</Link>
        </div>
      </div>

      <form onSubmit={submitInterview} className="card">
        <div>
          <div className="grid grid-cols-1 gap-8">
              {/* Candidate Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Candidate Information</h3>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="label">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="input"
                    required
                    pattern="^\+?[0-9\s()-]{7,}"
                    placeholder="+1 (555) 000-0000"
                    value={config.phoneNumber}
                    onChange={(e) => setConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="input"
                    required
                    placeholder="candidate@example.com"
                    value={config.email}
                    onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                {/* Programming Language */}
                <div>
                  <label className="label">
                    Programming Language <span className="text-sm text-slate-500">(editable)</span>
                  </label>
                  <select
                    className={`input appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23111111' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")] bg-[length:1.25rem_1.25rem] bg-[right_.5rem_center] bg-no-repeat cursor-pointer hover:border-blue-300 focus:border-blue-500`}
                    value={config.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Default: JavaScript. Change as needed for your interview focus.</p>
                </div>
              </div>

              {/* Interview Configuration */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Interview Configuration</h3>
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="label">
                    Custom Interview Focus
                  </label>
                  <textarea
                    className="input resize-none"
                    rows={4}
                    placeholder="Example: Focus on React hooks and state management, async/await patterns, closures, etc. Leave empty for general questions."
                    value={config.customPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 mt-1">50 questions will be automatically generated when the interview starts.</p>
                </div>

                {/* Meeting Link */}
                <div>
                  <label className="label">Scheduling Link (sent to those who pass)</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://cal.com/your-team/intro" 
                    value={config.meetingLink}
                    onChange={(e) => setConfig(prev => ({ ...prev, meetingLink: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional. Example: Google Meet, Zoom, or Cal.com link.</p>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="label">
                    Expected Experience Level
                  </label>
                  <select
                    className={`input appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23111111' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")] bg-[length:1.25rem_1.25rem] bg-[right_.5rem_center] bg-no-repeat`}
                    value={config.yoe}
                    onChange={(e) => setConfig(prev => ({ ...prev, yoe: e.target.value }))}
                  >
                    <option value="">Select experience level...</option>
                    <option value="0-1">0-1 years (Junior)</option>
                    <option value="2-3">2-3 years (Mid-level)</option>
                    <option value="4-6">4-6 years (Senior)</option>
                    <option value="7+">7+ years (Expert)</option>
                  </select>
                </div>

                {/* Pass Percentage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                      Pass Threshold
                    </label>
                    <span className="text-xs text-slate-500">{config.passPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800"
                    value={config.passPercentage}
                    onChange={(e) => setConfig(prev => ({ ...prev, passPercentage: parseInt(e.target.value) }))}
                  />
                  <div className="flex justify-between text-xs mt-1 text-slate-500">
                    <span>30%</span>
                    <span>Recommended: 50-70%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>


        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">This will call the candidate and start the technical interview.</p>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full sm:w-auto disabled:opacity-50 inline-flex items-center">
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-transparent mr-2" />
                {loadingStep || 'Processing...'}
              </>
            ) : (
              'Start Interview Call'
            )}
          </button>
        </div>
      </form>
      
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  Interview Started!
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  {successMessage}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:text-green-600"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}