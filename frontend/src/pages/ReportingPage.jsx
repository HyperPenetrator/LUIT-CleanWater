import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Droplet, Copy, MessageSquare, CheckCircle } from 'lucide-react'
import api from '../api'

export default function ReportingPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    problem: '',
    sourceType: '',
    pinCode: '',
    localityName: '',
    district: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [smsFormat, setSmsFormat] = useState('')
  const [smsCompact, setSmsCompact] = useState('')
  const [copied, setCopied] = useState(false)
  const [smsInput, setSmsInput] = useState('')
  const [smsSubmitting, setSmsSubmitting] = useState(false)
  const [smsSuccess, setSmsSuccess] = useState(false)
  const [smsError, setSmsError] = useState('')

  const assam_districts = [
    'Assam', 'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang',
    'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat',
    'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong',
    'Karimganj', 'Lakhimpur', 'Morigaon', 'Nagaland', 'Nalbari',
    'Sichar', 'Sonitpur', 'Tinsukia'
  ]

  const waterSources = [
    'Handpump',
    'Dug well/Open well',
    'Tube well/Borewell',
    'Piped water supply',
    'River water',
    'Ponds/Reservoir'
  ]

  const waterProblems = [
    'Muddy water',
    'Reddish brown water',
    'Pungent smell',
    'Metallic taste',
    'Health symptom'
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateSMSFormat = async () => {
    try {
      const response = await api.post('/reporting/sms/format', formData)
      if (response.data.success) {
        setSmsFormat(response.data.sms_format)
        setSmsCompact(response.data.sms_compact)
      }
    } catch (err) {
      console.error('Error generating SMS format:', err)
    }
  }

  const copySMS = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSMSSubmit = async (e) => {
    e.preventDefault()
    setSmsSubmitting(true)
    setSmsError('')
    setSmsSuccess(false)

    try {
      const response = await api.post('/reporting/sms/parse', {
        sms_text: smsInput
      })

      if (response.data.success) {
        setSmsSuccess(true)
        setSmsInput('')
        setTimeout(() => {
          setSmsSuccess(false)
        }, 3000)
      }
    } catch (err) {
      setSmsError(err.response?.data?.error || 'Failed to parse SMS')
    } finally {
      setSmsSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!formData.problem || !formData.sourceType || !formData.pinCode || !formData.localityName || !formData.district) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await api.post('/reporting/submit-report', {
        problem: formData.problem,
        sourceType: formData.sourceType,
        pinCode: formData.pinCode,
        localityName: formData.localityName,
        district: formData.district
      })

      if (response.data.success) {
        setSuccess(true)
        setFormData({
          problem: '',
          sourceType: '',
          pinCode: '',
          localityName: '',
          district: ''
        })
        setSmsFormat('')

        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold text-blue-600">LUIT Clean Water</h1>
          </div>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Home
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="card">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Report Water Contamination</h2>
            <p className="text-gray-600">Help us keep track of water quality issues in your area</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <AlertCircle className="inline mr-2" size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
              Report submitted successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Water Problem *
              </label>
              <select
                name="problem"
                value={formData.problem}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Problem --</option>
                {waterProblems.map(problem => (
                  <option key={problem} value={problem}>{problem}</option>
                ))}
              </select>
            </div>

            {/* Type of Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Source *
              </label>
              <select
                name="sourceType"
                value={formData.sourceType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Source --</option>
                {waterSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* Pin Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pin Code *
              </label>
              <input
                type="text"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleInputChange}
                placeholder="Enter pin code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Locality Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locality Name *
              </label>
              <input
                type="text"
                name="localityName"
                value={formData.localityName}
                onChange={handleInputChange}
                placeholder="Enter locality name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District *
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select District --</option>
                {assam_districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* SMS Format Section */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="text-blue-600" />
                📱 Offline SMS Format
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate SMS format to save for later. Submit when you have internet connection.
              </p>
              <button
                type="button"
                onClick={generateSMSFormat}
                className="btn-secondary mb-4"
              >
                📋 Generate SMS Format
              </button>
              
              {smsFormat && (
                <div className="space-y-4">
                  {/* Compact Format */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Compact Format (Easy to copy)</p>
                      <button
                        type="button"
                        onClick={() => copySMS(smsCompact)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium"
                      >
                        {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-white p-3 border-2 border-blue-300 rounded text-sm font-mono break-words shadow-sm">
                      {smsCompact}
                    </div>
                  </div>

                  {/* Full Format */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Full Format (Detailed)</p>
                      <button
                        type="button"
                        onClick={() => copySMS(smsFormat)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium"
                      >
                        {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-white p-3 border border-gray-300 rounded text-xs font-mono break-words whitespace-pre-wrap shadow-sm max-h-40 overflow-y-auto">
                      {smsFormat}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                    <p className="text-xs text-yellow-800">
                      💡 <strong>Tip:</strong> Copy this text and save it. When you have internet, paste it in the "Submit SMS Report" section below to submit.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-success flex-1 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : '✓ Submit Report Online'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* SMS Submission Section */}
        <div className="card mt-8 bg-gradient-to-br from-green-50 to-blue-50">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <MessageSquare className="text-green-600" size={28} />
            Submit SMS Report
          </h2>
          <p className="text-gray-600 mb-6">
            Have an SMS format saved? Paste it here to submit your offline report.
          </p>

          <form onSubmit={handleSMSSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste SMS Content
              </label>
              <textarea
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
                placeholder="Paste your SMS format here... Example: WQ|781014|Health symptoms|Tube well|Bad taste"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                rows="4"
                required
              />
            </div>

            {smsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {smsError}
                </p>
              </div>
            )}

            {smsSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  SMS report submitted successfully!
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={smsSubmitting}
                className="btn-success flex-1 disabled:opacity-50"
              >
                {smsSubmitting ? 'Processing...' : '📤 Submit SMS Report'}
              </button>
              <button
                type="button"
                onClick={() => setSmsInput('')}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                <strong>Supported Formats:</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1 font-mono">
                • Compact: WQ|PINCODE|ISSUE|SOURCE|DESCRIPTION
              </p>
              <p className="text-xs text-blue-700 font-mono">
                • Structured: PIN CODE: 781014, ISSUE: Health symptoms, SOURCE: Tube well
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
