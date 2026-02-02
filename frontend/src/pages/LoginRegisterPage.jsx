import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Building2, MapPin, Droplet, AlertCircle } from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function LoginRegisterPage() {
  const navigate = useNavigate()
  const { logout: authLogout } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [userType, setUserType] = useState('phc') // 'phc' or 'lab'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    district: 'Assam'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!navigate) {
    return <div className="flex items-center justify-center h-screen text-red-600">Error: Navigation not available</div>
  }

  const assam_districts = [
    'Assam', 'Barpeta', 'Bongaigaon', 'Cachar', 'Darrang',
    'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat',
    'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong',
    'Karimganj', 'Lakhimpur', 'Morigaon', 'Nagaland', 'Nalbari',
    'Sichar', 'Sonitpur', 'Tinsukia'
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Login
        console.log('Attempting login...')
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password,
          userType: userType
        })

        console.log('Login response:', response.data)

        if (response.data.success) {
          console.log('Login successful, storing token and redirecting...')
          localStorage.setItem('authToken', response.data.token)
          localStorage.setItem('userType', userType)
          localStorage.setItem('email', response.data.email)
          localStorage.setItem('district', response.data.district || 'Assam')

          // Redirect immediately - the layout will handle checking auth
          if (userType === 'phc') {
            console.log('Navigating to PHC dashboard...')
            navigate('/phc-dashboard', { replace: true })
          } else {
            console.log('Navigating to Lab dashboard...')
            navigate('/lab-dashboard', { replace: true })
          }
        } else {
          console.log('Login response success=false')
          setError('Login failed')
        }
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        if (!formData.organizationName) {
          setError('Organization name is required')
          setLoading(false)
          return
        }

        const response = await api.post('/auth/register', {
          email: formData.email,
          password: formData.password,
          userType: userType,
          organizationName: formData.organizationName,
          district: formData.district
        })

        if (response.data.success) {
          setError('')
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            organizationName: '',
            district: 'Assam'
          })
          setIsLogin(true)
          alert('Registration successful! Please login.')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      console.error('Backend error details:', err.response?.data)
      if (err.response?.data?.traceback) {
        console.error('Full traceback:', err.response.data.traceback)
      }
      setError(err.response?.data?.error || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
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
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="card">
            {/* User Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setUserType('phc')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    userType === 'phc'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <Building2 className="mx-auto mb-2" size={24} />
                  <p className="font-medium text-sm">PHC</p>
                  <p className="text-xs text-gray-600">Public Health Center</p>
                </button>
                <button
                  onClick={() => setUserType('lab')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    userType === 'lab'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <Building2 className="mx-auto mb-2" size={24} />
                  <p className="font-medium text-sm">Water Lab</p>
                  <p className="text-xs text-gray-600">Treatment Lab</p>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b">
              <button
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={`pb-2 font-medium transition-colors ${
                  isLogin
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className={`pb-2 font-medium transition-colors ${
                  !isLogin
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="inline mr-2" size={20} />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Organization Name (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      placeholder={userType === 'phc' ? 'PHC Name' : 'Lab Name'}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* District (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District *
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {assam_districts.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2 font-medium disabled:opacity-50"
              >
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
