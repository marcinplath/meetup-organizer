import React from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import MainLayout from './components/layout/MainLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Calendar from './pages/Calendar'
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import Profile from './pages/Profile'
import Surveys from './pages/Surveys'
import LoadingScreen from './components/common/LoadingScreen'
import LandingPage from './pages/LandingPage'
import AuthCallback from './pages/AuthCallback'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Komponent do zabezpieczania ścieżek
const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, loading } = useAuth()
  
  console.log('[ProtectedRoute] Stan:', { loading, isAuthenticated: !!user })
  
  if (loading) {
    console.log('[ProtectedRoute] Wyświetlam ekran ładowania')
    return <LoadingScreen />
  }
  
  if (!user) {
    console.log('[ProtectedRoute] Brak użytkownika, przekierowuję do /login')
    return <Navigate to="/login" replace />
  }
  
  console.log('[ProtectedRoute] Użytkownik zalogowany, renderuję chronioną zawartość')
  return <>{element}</>
}

// Komponent strony głównej
const HomePage = () => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingScreen />
  }
  
  return user ? <Home /> : <LandingPage />
}

// Główny komponent aplikacji
function App() {
  console.log('[App] Rozpoczynam renderowanie App')
  
  return (
    <AuthProvider>
      <ChakraProvider>
        <Router>
          <Routes>
            {/* Publiczne ścieżki */}
            <Route path="/login" element={
              <MainLayout>
                <Login />
              </MainLayout>
            } />
            <Route path="/register" element={
              <MainLayout>
                <Register />
              </MainLayout>
            } />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Strona główna */}
            <Route
              path="/"
              element={
                <MainLayout>
                  <HomePage />
                </MainLayout>
              }
            />
            
            {/* Chronione ścieżki */}
            <Route
              path="/calendar"
              element={
                <MainLayout>
                  <ProtectedRoute element={<Calendar />} />
                </MainLayout>
              }
            />
            <Route
              path="/events"
              element={
                <MainLayout>
                  <ProtectedRoute element={<Events />} />
                </MainLayout>
              }
            />
            <Route
              path="/events/:id"
              element={
                <MainLayout>
                  <ProtectedRoute element={<EventDetails />} />
                </MainLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <MainLayout>
                  <ProtectedRoute element={<Profile />} />
                </MainLayout>
              }
            />
            <Route
              path="/surveys"
              element={
                <MainLayout>
                  <ProtectedRoute element={<Surveys />} />
                </MainLayout>
              }
            />
            
            {/* Przekierowanie dla nieznanych ścieżek */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ChakraProvider>
    </AuthProvider>
  )
}

// Główny eksport z opakowaniem kontekstami
const AppWithProviders = () => {
  console.log('[AppWithProviders] Inicjalizacja aplikacji')
  
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

export default AppWithProviders 