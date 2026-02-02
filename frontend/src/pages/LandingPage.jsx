import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, AlertTriangle, CheckCircle, Droplet } from 'lucide-react'
import api from '../api'

export default function LandingPage() {
  const navigate = useNavigate()
  const [areaStatus, setAreaStatus] = useState('loading')
  const [activeReports, setActiveReports] = useState([])
  const [reportedIssues, setReportedIssues] = useState([])
  const [statistics, setStatistics] = useState({})
  const [userLocation, setUserLocation] = useState(null)
  const [showStatusPopup, setShowStatusPopup] = useState(true)

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ latitude, longitude })
        fetchAreaStatus(latitude, longitude)
      })
    }
    
    fetchActiveReports()
    fetchReportedIssues()
    fetchStatistics()
  }, [])

  const fetchAreaStatus = async (lat, lon) => {
    try {
      const response = await api.get('/water-quality/area-status', {
        params: { latitude: lat, longitude: lon, radius: 1 }
      })
      setAreaStatus(response.data.status)
    } catch (error) {
      console.error('Error fetching area status:', error)
      console.error('Backend error details:', error.response?.data)
      if (error.response?.data?.traceback) {
        console.error('Full traceback:', error.response.data.traceback)
      }
      setAreaStatus('unknown')
    }
  }

  const fetchActiveReports = async () => {
    try {
      const response = await api.get('/water-quality/active-reports')
      setActiveReports(Object.values(response.data.data || {}))
    } catch (error) {
      console.error('Error fetching active reports:', error)
      console.error('Backend error details:', error.response?.data)
      if (error.response?.data?.traceback) {
        console.error('Full traceback:', error.response.data.traceback)
      }
    }
  }

  const fetchReportedIssues = async () => {
    try {
      const response = await api.get('/reporting/reported-issues')
      setReportedIssues(Object.values(response.data.data || {}))
    } catch (error) {
      console.error('Error fetching reported issues:', error)
      console.error('Backend error details:', error.response?.data)
      if (error.response?.data?.traceback) {
        console.error('Full traceback:', error.response.data.traceback)
      }
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/water-quality/statistics')
      setStatistics(response.data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      console.error('Backend error details:', error.response?.data)
      if (error.response?.data?.traceback) {
        console.error('Full traceback:', error.response.data.traceback)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold text-blue-600">LUIT Clean Water</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="btn-primary">
              Login
            </button>
            <button onClick={() => navigate('/report')} className="btn-success">
              Report Issue
            </button>
          </div>
        </nav>
      </header>

      {/* Status Popup */}
      {showStatusPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Your Area Status</h2>
              <button
                onClick={() => setShowStatusPopup(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className={`p-6 rounded-lg mb-4 flex items-center gap-3 ${
              areaStatus === 'clean'
                ? 'bg-green-100'
                : areaStatus === 'contaminated'
                ? 'bg-red-100'
                : 'bg-yellow-100'
            }`}>
              {areaStatus === 'clean' ? (
                <CheckCircle className="text-green-600" size={40} />
              ) : areaStatus === 'contaminated' ? (
                <AlertTriangle className="text-red-600" size={40} />
              ) : (
                <Droplet className="text-yellow-600" size={40} />
              )}
              <div>
                <h3 className="font-bold text-lg">
                  {areaStatus === 'clean' ? 'Clean Water' : areaStatus === 'contaminated' ? 'Contaminated Water' : 'Status Unknown'}
                </h3>
                <p className="text-sm">Current status at your location</p>
              </div>
            </div>

            <button
              onClick={() => setShowStatusPopup(false)}
              className="btn-primary w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="card">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome to LUIT Clean Water</h2>
            <p className="text-gray-600 text-lg mb-4">
              A community-driven platform to report and track water quality issues across Assam.
              Together, we can ensure clean drinking water for everyone.
            </p>
            <p className="text-gray-600">
              Report contaminated water bodies, track lab testing results, and stay informed about
              the status of water quality in your area.
            </p>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-blue-600 mb-2">
              {statistics.totalReports || 0}
            </h3>
            <p className="text-gray-600">Total Reports</p>
          </div>
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-red-600 mb-2">
              {statistics.activeReports || 0}
            </h3>
            <p className="text-gray-600">Active Issues</p>
          </div>
          <div className="card text-center">
            <h3 className="text-4xl font-bold text-green-600 mb-2">
              {statistics.cleanAreas || 0}
            </h3>
            <p className="text-gray-600">Clean Areas</p>
          </div>
        </section>

        {/* Active Reports */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Active Reports in Your Area</h2>
          {activeReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeReports.slice(0, 6).map((report, idx) => (
                <div key={idx} className="card border-l-4 border-red-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{report.areaName}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      report.severity === 'high' ? 'bg-red-200 text-red-800' :
                      report.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-orange-200 text-orange-800'
                    }`}>
                      {report.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{report.problem}</p>
                  <p className="text-sm text-gray-500">Source: {report.sourceType}</p>
                  <p className="text-sm text-gray-500">Upvotes: {report.upvotes || 0}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
              <p className="text-gray-600">No active reports in your area</p>
            </div>
          )}
        </section>

        {/* Reported Issues */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Recent Reported Issues</h2>
          {reportedIssues.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {reportedIssues.slice(0, 5).map((issue, idx) => (
                <div key={idx} className="card flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{issue.areaName}</h3>
                    <p className="text-gray-600 text-sm">{issue.problem}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      issue.status === 'clean' ? 'status-clean' :
                      issue.status === 'contaminated' ? 'status-contaminated' :
                      'status-pending'
                    }`}>
                      {issue.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-gray-600">No recent issues reported</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-6 mt-12">
        <p>&copy; 2024 LUIT Clean Water - Hackathon Project. All rights reserved.</p>
      </footer>
    </div>
  )
}
