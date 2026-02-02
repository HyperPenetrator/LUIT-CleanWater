import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, AlertTriangle, CheckCircle, MapPin, FileText, Droplet } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function PHCDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('reports')
  const [activeReports, setActiveReports] = useState([])
  const [previousSolutions, setPreviousSolutions] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [reportedIssues, setReportedIssues] = useState([])
  const [statistics, setStatistics] = useState({})
  const [areaStatus, setAreaStatus] = useState('loading')
  const [userLocation, setUserLocation] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendFormData, setSendFormData] = useState({
    description: '',
    phcNotes: ''
  })
  const [reportFormData, setReportFormData] = useState({
    problem: '',
    latitude: '',
    longitude: '',
    severity: 'medium',
    sourceType: 'domestic',
    areaName: '',
    pinCode: '',
    district: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const userEmail = localStorage.getItem('email') || 'PHC User'
  const userDistrict = localStorage.getItem('district') || 'Assam'

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ latitude, longitude })
        fetchAreaStatus(latitude, longitude)
      })
    }
    
    fetchActiveReports()
    fetchPreviousSolutions()
    fetchHotspots()
    fetchReportedIssues()
    fetchStatistics()
  }, [])

  const fetchActiveReports = async () => {
    try {
      const response = await api.get(`/phc/active-reports/${userDistrict}`)
      setActiveReports(Object.entries(response.data.data || {}).map(([id, data]) => ({
        id,
        ...data
      })))
    } catch (err) {
      console.error('Error fetching active reports:', err)
      setError('Failed to load active reports')
    }
  }

  const fetchPreviousSolutions = async () => {
    try {
      const response = await api.get('/phc/previous-solutions', {
        params: { district: userDistrict }
      })
      setPreviousSolutions(Object.entries(response.data.data || {}).map(([id, data]) => ({
        id,
        ...data
      })))
    } catch (err) {
      console.error('Error fetching solutions:', err)
    }
  }

  const fetchHotspots = async () => {
    try {
      const response = await api.get('/phc/hotspot-map', {
        params: { district: userDistrict }
      })
      setHotspots(response.data.data || [])
    } catch (err) {
      console.error('Error fetching hotspots:', err)
    }
  }

  const fetchAreaStatus = async (latitude, longitude) => {
    try {
      const response = await api.get('/water-quality/area-status', {
        params: { latitude, longitude },
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      })
      setAreaStatus(response.data.status || 'normal')
    } catch (err) {
      console.error('Failed to fetch area status:', err)
      setAreaStatus('normal')
    }
  }

  const fetchReportedIssues = async () => {
    try {
      const response = await api.get('/reporting/reported-issues', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      })
      setReportedIssues(response.data.issues || [])
    } catch (err) {
      console.error('Failed to fetch reported issues:', err)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/water-quality/statistics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      })
      setStatistics(response.data || {})
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }

  const handleSendToLab = async () => {
    if (!selectedReport) return
    if (!sendFormData.description) {
      setError('Please enter a description')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/phc/send-to-lab', {
        reportId: selectedReport.id,
        description: sendFormData.description,
        phcNotes: sendFormData.phcNotes,
        areaName: selectedReport.areaName,
        district: userDistrict,
        latitude: selectedReport.latitude,
        longitude: selectedReport.longitude,
        severity: selectedReport.severity
      })

      if (response.data.success) {
        alert('Report sent to lab successfully!')
        setShowSendModal(false)
        setSendFormData({ description: '', phcNotes: '' })
        setSelectedReport(null)
        fetchActiveReports()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send report')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkClean = async (reportId) => {
    if (!window.confirm('Mark this area as clean?')) return

    try {
      const response = await api.post(`/phc/mark-clean/${reportId}`, {
        verified: true
      })

      if (response.data.success) {
        alert('Area marked as clean!')
        fetchActiveReports()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as clean')
    }
  }

  const handleReportSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!reportFormData.problem || !reportFormData.latitude || !reportFormData.longitude) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await api.post('/reporting/submit-report', {
        problem: reportFormData.problem,
        latitude: parseFloat(reportFormData.latitude),
        longitude: parseFloat(reportFormData.longitude),
        severity: reportFormData.severity,
        sourceType: reportFormData.sourceType,
        areaName: reportFormData.areaName,
        pinCode: reportFormData.pinCode,
        district: userDistrict
      })

      if (response.data.success) {
        setSuccess(true)
        setReportFormData({
          problem: '',
          latitude: '',
          longitude: '',
          severity: 'medium',
          sourceType: 'domestic',
          areaName: '',
          pinCode: '',
          district: ''
        })
        setTimeout(() => {
          setSuccess(false)
          setActiveTab('reports')
          fetchActiveReports()
        }, 2000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">PHC Dashboard</h1>
              <p className="text-sm text-gray-600">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 btn-danger"
          >
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-4 text-red-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {['overview', 'report', 'reports', 'solutions', 'hotspots'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Water Quality Dashboard - {userDistrict}</h2>
            
            {/* Area Status */}
            <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="text-blue-600" size={24} />
                <h3 className="text-lg font-bold text-gray-800">Current Area Status</h3>
              </div>
              <p className={`text-2xl font-bold mt-2 ${
                areaStatus === 'safe' ? 'text-green-600' :
                areaStatus === 'warning' ? 'text-yellow-600' :
                areaStatus === 'critical' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {areaStatus === 'loading' ? 'Checking status...' : areaStatus.toUpperCase()}
              </p>
              {userLocation && (
                <p className="text-sm text-gray-600 mt-2">
                  📍 Your Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </p>
              )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Reports</h3>
                <p className="text-3xl font-bold text-blue-600">{statistics.totalReports || 0}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Active Issues</h3>
                <p className="text-3xl font-bold text-red-600">{statistics.activeReports || 0}</p>
              </div>
              <div className="card">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Clean Areas</h3>
                <p className="text-3xl font-bold text-green-600">{statistics.cleanAreas || 0}</p>
              </div>
            </div>

            {/* Reported Issues */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Reported Issues</h3>
              {reportedIssues.length > 0 ? (
                <div className="space-y-3">
                  {reportedIssues.map((issue, idx) => (
                    <div key={idx} className="card">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{issue.title || issue.problem}</p>
                          <p className="text-sm text-gray-600 mt-1">{issue.description || issue.details}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            📍 {issue.areaName || 'Unknown Area'} | {issue.reportedAt || 'Recently'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
                  <p className="text-gray-600">No reported issues in your area</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Report Water Quality Issue</h2>
            
            {success && (
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                ✓ Report submitted successfully!
              </div>
            )}

            {error && (
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="max-w-2xl mx-auto">
              <div className="card space-y-6">
                {/* Problem Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Problem Description *
                  </label>
                  <textarea
                    name="problem"
                    value={reportFormData.problem}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, problem: e.target.value }))}
                    placeholder="Describe the water quality issue..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    required
                  />
                </div>

                {/* Area Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area Name
                  </label>
                  <input
                    type="text"
                    name="areaName"
                    value={reportFormData.areaName}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, areaName: e.target.value }))}
                    placeholder="Enter area name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity Level *
                  </label>
                  <select
                    name="severity"
                    value={reportFormData.severity}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Source Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Type
                  </label>
                  <select
                    name="sourceType"
                    value={reportFormData.sourceType}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, sourceType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="domestic">Domestic</option>
                    <option value="industrial">Industrial</option>
                    <option value="agricultural">Agricultural</option>
                    <option value="natural">Natural</option>
                  </select>
                </div>

                {/* Pin Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    name="pinCode"
                    value={reportFormData.pinCode}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, pinCode: e.target.value }))}
                    placeholder="Enter PIN code"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Location Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} /> Location Marker
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        name="latitude"
                        value={reportFormData.latitude}
                        onChange={(e) => setReportFormData(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="e.g., 26.1445"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        name="longitude"
                        value={reportFormData.longitude}
                        onChange={(e) => setReportFormData(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="e.g., 91.7898"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                          setReportFormData(prev => ({
                            ...prev,
                            latitude: position.coords.latitude.toFixed(6),
                            longitude: position.coords.longitude.toFixed(6)
                          }))
                        })
                      }
                    }}
                    className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium mb-4"
                  >
                    📍 Use Current Location
                  </button>

                  {reportFormData.latitude && reportFormData.longitude && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-700">
                        <strong>Pin Location:</strong><br />
                        Latitude: {reportFormData.latitude}<br />
                        Longitude: {reportFormData.longitude}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : '🚀 Submit Report to Lab'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportFormData({
                        problem: '',
                        latitude: '',
                        longitude: '',
                        severity: 'medium',
                        sourceType: 'domestic',
                        areaName: '',
                        pinCode: '',
                        district: ''
                      })
                      setError('')
                    }}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Active Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Active Reports in {userDistrict}</h2>
            {activeReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeReports.map(report => (
                  <div key={report.id} className="card border-l-4 border-red-500">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{report.areaName}</h3>
                        <p className="text-sm text-gray-600">{report.problem}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        report.severity === 'high' ? 'bg-red-200 text-red-800' :
                        report.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-orange-200 text-orange-800'
                      }`}>
                        {report.severity?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <p>📍 Location: {report.latitude}, {report.longitude}</p>
                      <p>🏭 Source: {report.sourceType}</p>
                      <p>📌 Pin: {report.pinCode}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report)
                          setShowSendModal(true)
                        }}
                        className="flex-1 btn-primary text-sm py-2"
                      >
                        Send to Lab
                      </button>
                      <button
                        onClick={() => handleMarkClean(report.id)}
                        className="flex-1 btn-success text-sm py-2"
                      >
                        Mark Clean
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No active reports in your district</p>
              </div>
            )}
          </div>
        )}

        {/* Previous Solutions Tab */}
        {activeTab === 'solutions' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Previous Solutions</h2>
            {previousSolutions.length > 0 ? (
              <div className="space-y-4">
                {previousSolutions.map(solution => (
                  <div key={solution.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{solution.areaName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{solution.solutionDescription}</p>
                      </div>
                      <span className="status-clean">Resolved</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <a href="#" className="text-blue-600 hover:underline flex items-center gap-1">
                        <FileText size={16} /> Test Result
                      </a>
                      <a href="#" className="text-blue-600 hover:underline flex items-center gap-1">
                        <FileText size={16} /> Solution
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No previous solutions available</p>
              </div>
            )}
          </div>
        )}

        {/* Hotspots Tab */}
        {activeTab === 'hotspots' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Water Quality Hotspots</h2>
            {hotspots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hotspots.map(hotspot => (
                  <div key={hotspot.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className={hotspot.isActive ? 'text-red-600' : 'text-green-600'} />
                      <h3 className="font-bold text-lg text-gray-800">{hotspot.areaName}</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>📍 Lat: {hotspot.latitude.toFixed(4)}, Lon: {hotspot.longitude.toFixed(4)}</p>
                      <p>⚠️ Severity: {hotspot.severity}</p>
                      <p className={`font-medium ${hotspot.isActive ? 'text-red-600' : 'text-green-600'}`}>
                        {hotspot.isActive ? '🔴 Active Contamination' : '🟢 Clean'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <p className="text-gray-600">No hotspots recorded</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Send to Lab Modal */}
      {showSendModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Send Report to Lab</h2>
            <p className="text-gray-600 mb-4">Area: <strong>{selectedReport.areaName}</strong></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={sendFormData.description}
                  onChange={(e) => setSendFormData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Detailed description for the lab"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PHC Notes
                </label>
                <textarea
                  value={sendFormData.phcNotes}
                  onChange={(e) => setSendFormData(prev => ({
                    ...prev,
                    phcNotes: e.target.value
                  }))}
                  placeholder="Additional notes"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendToLab}
                  disabled={loading}
                  className="flex-1 btn-success disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send to Lab'}
                </button>
                <button
                  onClick={() => {
                    setShowSendModal(false)
                    setSelectedReport(null)
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
