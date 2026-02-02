import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for auth token
    const token = localStorage.getItem('authToken')
    const storedUserType = localStorage.getItem('userType')
    const email = localStorage.getItem('email')
    
    if (token && storedUserType && email) {
      setUser({ email }) // Set a minimal user object
      setUserType(storedUserType)
    }
    
    setLoading(false)
  }, [])

  const logout = () => {
    setUser(null)
    setUserType(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('userType')
    localStorage.removeItem('email')
  }

  return (
    <AuthContext.Provider value={{ user, userType, loading, logout }}>
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
