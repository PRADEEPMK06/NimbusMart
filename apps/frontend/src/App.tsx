import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RepositoryProvider } from './contexts/RepositoryContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Repositories from './pages/Repositories'
import Deployments from './pages/Deployments'
import NewDeployment from './pages/NewDeployment'
import DeploymentDetails from './pages/DeploymentDetails'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <RepositoryProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="repositories" element={<Repositories />} />
            <Route path="deployments" element={<Deployments />} />
            <Route path="deployments/new" element={<NewDeployment />} />
            <Route path="deployments/:id" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </RepositoryProvider>
    </AuthProvider>
  )
}

export default App