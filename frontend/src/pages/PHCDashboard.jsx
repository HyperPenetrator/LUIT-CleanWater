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
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      console.log('Fetching active reports for district:', userDistrict)
      const response = await api.get(`/phc/active-reports/${userDistrict}`)
      console.log('Active reports response:', response.data)
      const reports = Object.entries(response.data.data || {}).map(([id, data]) => ({
        id,
        ...data
      }))
      console.log('Processed reports:', reports)
      
      // Group reports by PIN code
      const grouped = reports.reduce((acc, report) => {
        const pinCode = report.pinCode || 'Unknown'
        if (!acc[pinCode]) {
          acc[pinCode] = {
            pinCode,
            locality: report.localityName,
            district: report.district,
            reports: [],
            count: 0,
            severity: 'none'
          }
        }
        acc[pinCode].reports.push(report)
        acc[pinCode].count++
        
        // Calculate severity based on count
        if (acc[pinCode].count >= 20) {
          acc[pinCode].severity = 'severe'
        } else if (acc[pinCode].count >= 10) {
          acc[pinCode].severity = 'medium'
        } else if (acc[pinCode].count >= 5) {
          acc[pinCode].severity = 'mild'
        }
        
        return acc
      }, {})
      
      console.log('Grouped by PIN code:', grouped)
      setActiveReports(Object.values(grouped))
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
        params: { district: userDistrict },
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
        pinCode: selectedReport.pinCode,
        localityName: selectedReport.locality,
        district: selectedReport.district,
        reportCount: selectedReport.count,
        severity: selectedReport.severity,
        reportIds: selectedReport.reports.map(r => r.id),
        problems: [...new Set(selectedReport.reports.map(r => r.problem))],
        sources: [...new Set(selectedReport.reports.map(r => r.sourceType))],
        description: sendFormData.description
      })

      if (response.data.success) {
        alert('Report sent to lab successfully!')
        setShowSendModal(false)
        setSendFormData({ description: '' })
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
          {['overview', 'reports', 'solutions', 'hotspots'].map(tab => (
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

        {/* Active Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Active Reports in {userDistrict}</h2>
            {activeReports.length > 0 ? (
              <div className="space-y-6">
                {activeReports.map(group => (
                  <div key={group.pinCode} className={`card border-l-4 ${
                    group.severity === 'severe' ? 'border-red-600 bg-red-50' :
                    group.severity === 'medium' ? 'border-orange-500 bg-orange-50' :
                    group.severity === 'mild' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-300'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">📌 PIN: {group.pinCode}</h3>
                        <p className="text-sm text-gray-600">{group.locality}, {group.district}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-800">{group.count}</div>
                        <div className="text-xs text-gray-500">Reports</div>
                        {group.severity !== 'none' && (
                          <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            group.severity === 'severe' ? 'bg-red-600 text-white' :
                            group.severity === 'medium' ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {group.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Problem Summary */}
                    <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Reported Issues:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(group.reports.map(r => r.problem))].map(problem => (
                          <span key={problem} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {problem}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[...new Set(group.reports.map(r => r.sourceType))].map(source => (
                          <span key={source} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                            💧 {source}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {group.count >= 5 ? (
                        <button
                          onClick={() => {
                            setSelectedReport(group)
                            setShowSendModal(true)
                          }}
                          className="flex-1 btn-primary text-sm py-2"
                        >
                          🔬 Send to Testing Lab ({group.count} reports)
                        </button>
                      ) : (
                        <div className="flex-1 p-3 bg-gray-100 text-center rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-sm text-gray-600">
                            Need {5 - group.count} more report(s) to send to lab
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Threshold: 5 reports</p>
                        </div>
                      )}
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
            <h2 className="text-2xl font-bold mb-4">Send to Testing Lab</h2>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>📌 PIN Code:</strong> {selectedReport.pinCode}
              </p>
              <p className="text-sm text-gray-700">
                <strong>📍 Location:</strong> {selectedReport.locality}
              </p>
              <p className="text-sm text-gray-700">
                <strong>📊 Reports:</strong> {selectedReport.count} ({selectedReport.severity})
              </p>
            </div>

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
                  placeholder="Detailed description for the testing lab team..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="6"
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
