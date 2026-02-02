import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)

  // Function to check and update auth from localStorage
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('authToken')
    const storedUserType = localStorage.getItem('userType')
    const email = localStorage.getItem('email')
    
    if (token && storedUserType && email) {
      setUser({ email })
      setUserType(storedUserType)
      return true
    } else {
      setUser(null)
      setUserType(null)
      return false
    }
  }, [])

  // Manual auth trigger for same-tab login
  const setAuthState = useCallback((userEmail, uType) => {
    if (userEmail && uType) {
      setUser({ email: userEmail })
      setUserType(uType)
    }
  }, [])

  useEffect(() => {
    // Initial check on mount
    checkAuth()
    setLoading(false)

    // Listen for storage changes (login/logout in same or different tab)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' || e.key === 'userType' || e.key === 'email') {
        checkAuth()
      }
    }

    // Poll localStorage every 50ms for the first 500ms to catch login in same tab
    let pollCount = 0
    const pollInterval = setInterval(() => {
      checkAuth()
      pollCount++
      if (pollCount > 10) clearInterval(pollInterval) // Stop after 500ms
    }, 50)

    window.addEventListener('storage', handleStorageChange)
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [checkAuth])

  const logout = () => {
    setUser(null)
    setUserType(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('userType')
    localStorage.removeItem('email')
    localStorage.removeItem('district')
  }

  return (
    <AuthContext.Provider value={{ user, userType, loading, logout, setAuthState, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
