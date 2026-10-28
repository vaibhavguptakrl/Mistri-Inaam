import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Plumbers } from './pages/Plumbers'
import { PointsRules } from './pages/PointsRules'
import { AddPoints } from './pages/AddPoints'
import { SettingsPage } from './pages/SettingsPage'
import { FeatureControlsPage } from './pages/FeatureControlsPage'
import { SchemesPage } from './pages/SchemesPage'
import { RedemptionsPage } from './pages/RedemptionsPage'
import { MessageLogPage } from './pages/MessageLogPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/plumbers" element={<Plumbers />} />
                    <Route path="/add-points" element={<AddPoints />} />
                    <Route path="/rules" element={<PointsRules />} />
                    <Route path="/schemes" element={<SchemesPage />} />
                    <Route path="/redemptions" element={<RedemptionsPage />} />
                    <Route path="/messages" element={<MessageLogPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/features" element={<FeatureControlsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
