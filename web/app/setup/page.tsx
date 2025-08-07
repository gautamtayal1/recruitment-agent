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
}

export default function InterviewSetup() {
  const [config, setConfig] = useState<InterviewConfig>({
    phoneNumber: '',
    email: '',
    language: '',
    customPrompt: '',
    yoe: '',
    passPercentage: 50
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
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 Interview Setup
            </h1>
            <p className="text-gray-600">Configure your custom technical interview</p>
          </div>

          <form onSubmit={submitInterview} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📞 Candidate Phone Number
              </label>
              <input
                type="tel"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1234567890"
                value={config.phoneNumber}
                onChange={(e) => setConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📧 Candidate Email
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="candidate@example.com"
                value={config.email}
                onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Coding Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💻 Coding Language
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={config.language}
                onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
              >
                <option value="">Select a language...</option>
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Custom Interview Focus (Prompt or 2-3 sample questions)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Example: Focus on React hooks and state management, or provide 2-3 specific questions you want to ask..."
                value={config.customPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
              />
              <button
                type="button"
                onClick={generateQuestions}
                disabled={isGenerating}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : '🤖 Generate 50 Questions Based on This'}
              </button>
            </div>

            {/* Generated Questions Preview */}
            {showQuestions && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">
                  ✅ Generated {generatedQuestions.length} Questions
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {generatedQuestions.map((question, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      <strong>{index + 1}.</strong> {question}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👨‍💼 Expected Years of Experience
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Minimum Score to Pass (%): {config.passPercentage}%
              </label>
              <input
                type="range"
                min="30"
                max="90"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={config.passPercentage}
                onChange={(e) => setConfig(prev => ({ ...prev, passPercentage: parseInt(e.target.value) }))}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>30%</span>
                <span>Recommended: 50-70%</span>
                <span>90%</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {isSubmitting ? 'Starting Interview...' : '🚀 Start Interview Call'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}