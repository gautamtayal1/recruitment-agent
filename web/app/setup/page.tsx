'use client'

import { useState } from 'react'

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
    language: '',
    customPrompt: '',
    yoe: '',
    passPercentage: 50,
    meetingLink: ''
  })

  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)

  const languages = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 
    'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'TypeScript'
  ]

  const generateQuestions = async () => {
    if (!config.customPrompt.trim()) {
      alert('Please enter a custom prompt or questions first')
      return
    }
    if (!config.language) {
      alert('Please select a coding language first')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8080/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: config.language,
          prompt: config.customPrompt
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setGeneratedQuestions(data.questions)
        setShowQuestions(true)
        setConfig(prev => ({ ...prev, questions: data.questions }))
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const submitInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!config.phoneNumber.trim() || !config.email.trim()) {
        alert('Please provide both phone number and email')
        setIsSubmitting(false)
        return
      }
      const response = await fetch('http://localhost:8080/api/setup-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const result = await response.json()
      
      if (result.success) {
        alert('✅ Interview setup complete! Starting call...')
        // Reset form
        setConfig({
          phoneNumber: '',
          email: '',
          language: '',
          customPrompt: '',
          yoe: '',
          passPercentage: 50
        })
        setGeneratedQuestions([])
        setShowQuestions(false)
      } else {
        alert('❌ Error: ' + result.error)
      }
    } catch (error) {
      alert('❌ Error: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
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
          <a href="/" className="btn btn-secondary">← Back to Dashboard</a>
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
                    Programming Language
                  </label>
                  <select
                    className={`input appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23111111' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")] bg-[length:1.25rem_1.25rem] bg-[right_.5rem_center] bg-no-repeat`}
                    value={config.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="">Select a language...</option>
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
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
                    placeholder="Example: Focus on React hooks and state management, or provide 2-3 specific questions..."
                    value={config.customPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={generateQuestions}
                    disabled={isGenerating}
                    className="mt-3 btn btn-primary w-full disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating Questions...' : 'Generate 50 Questions'}
                  </button>
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

        {/* Generated Questions Preview */}
        {showQuestions && (
          <div className="mt-8 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-slate-900/30 p-4">
            <h4 className="text-sm font-medium mb-3 text-accent">Generated {generatedQuestions.length} Questions</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {generatedQuestions.map((question, index) => (
                <div key={index} className="text-sm py-2 border-b last:border-b-0 border-[--color-card-border]">
                  <span className="font-medium mr-2 text-accent">{index + 1}.</span>
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">This will call the candidate and start the technical interview.</p>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full sm:w-auto disabled:opacity-50 inline-flex items-center">
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-transparent mr-2" />
                Starting Interview...
              </>
            ) : (
              'Start Interview Call'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}