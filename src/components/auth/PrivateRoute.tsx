import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null // lub komponent ładowania
  }

  if (!session) {
    // Zapisz ścieżkę, z której użytkownik został przekierowany
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
} 