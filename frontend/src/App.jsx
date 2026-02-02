import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import ReportingPage from './pages/ReportingPage'
import LoginRegisterPage from './pages/LoginRegisterPage'
import PHCDashboard from './pages/PHCDashboard'
import LabDashboard from './pages/LabDashboard'
import NotFound from './pages/NotFound'

const ProtectedRoute = ({ children, requiredUserType }) => {
  const { user, userType, loading } = useAuth()

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredUserType && userType !== requiredUserType) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { user, userType } = useAuth()
  
  return (
    <Routes>
      {/* Home page - redirect based on auth */}
      <Route 
        path="/" 
        element={
          user ? (
            userType === 'phc' ? <Navigate to="/phc-dashboard" replace /> : <Navigate to="/lab-dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route path="/report" element={<ReportingPage />} />
      <Route path="/login" element={<LoginRegisterPage />} />
      <Route
        path="/phc-dashboard"
        element={
          <ProtectedRoute requiredUserType="phc">
            <PHCDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab-dashboard"
        element={
          <ProtectedRoute requiredUserType="lab">
            <LabDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
