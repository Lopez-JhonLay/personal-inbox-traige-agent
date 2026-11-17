import { BrowserRouter, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import { AppLayout } from './components/AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
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
