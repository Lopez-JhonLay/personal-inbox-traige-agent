import { BrowserRouter, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import ActionsPage from './pages/ActionsPage'
import { AppLayout } from './components/AppLayout'
import PolicyPage from './pages/PolicyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/privacy"
          element={<PolicyPage key="privacy" page="privacy" />}
        />
        <Route
          path="/terms"
          element={<PolicyPage key="terms" page="terms" />}
        />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route
            path="*"
            element={
              <p>Page not found. Use the navigation to return to your inbox.</p>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
