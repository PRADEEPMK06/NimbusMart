import { useAuth } from '../contexts/AuthContext'
import { useRepositories } from '../contexts/RepositoryContext'
import { Link } from 'react-router-dom'
import { GitBranch, Rocket, Activity, Clock } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { repositories, deployments } = useRepositories()

  const recentDeployments = deployments.slice(0, 5)
  const runningDeployments = deployments.filter(d => d.status === 'running').length
  const failedDeployments = deployments.filter(d => d.status === 'failed').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {user?.full_name}!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <GitBranch className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Repositories</p>
              <p className="text-2xl font-bold text-gray-900">{repositories.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Running</p>
              <p className="text-2xl font-bold text-gray-900">{runningDeployments}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <Activity className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{failedDeployments}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Rocket className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Deployments</p>
              <p className="text-2xl font-bold text-gray-900">{deployments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Deployments</h2>
          <Link to="/deployments" className="text-primary-600 hover:text-primary-700 text-sm">
            View all
          </Link>
        </div>

        {recentDeployments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No deployments yet</p>
        ) : (
          <div className="space-y-3">
            {recentDeployments.map(deployment => (
              <div
                key={deployment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    deployment.status === 'running' ? 'bg-green-100' :
                    deployment.status === 'failed' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    <Activity size={20} className={
                      deployment.status === 'running' ? 'text-green-600' :
                      deployment.status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    } />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Deployment #{deployment.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {deployment.commit_message || deployment.commit_sha}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    deployment.status === 'running' ? 'bg-green-100 text-green-800' :
                    deployment.status === 'failed' ? 'bg-red-100 text-red-800' :
                    deployment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {deployment.status}
                  </span>
                  {deployment.public_url && (
                    <a
                      href={deployment.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-primary-600 hover:text-primary-700 mt-1"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}