import { Link } from 'react-router-dom'
import { useRepositories } from '../contexts/RepositoryContext'
import { Rocket, ExternalLink, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function Deployments() {
  const { deployments } = useRepositories()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="text-green-600" size={20} />
      case 'failed':
        return <XCircle className="text-red-600" size={20} />
      case 'building':
      case 'deploying':
        return <Loader className="text-yellow-600 animate-spin" size={20} />
      default:
        return <Clock className="text-gray-600" size={20} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'building':
      case 'deploying':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deployments</h1>
          <p className="mt-1 text-gray-600">Monitor and manage your deployments</p>
        </div>
        <Link to="/deployments/new" className="btn btn-primary flex items-center gap-2">
          <Rocket size={20} />
          New Deployment
        </Link>
      </div>

      {/* Deployments List */}
      <div className="card">
        {deployments.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
            <p className="text-gray-500 mb-4">Create your first deployment to get started</p>
            <Link to="/deployments/new" className="btn btn-primary">
              Create Deployment
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    {getStatusIcon(deployment.status)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Deployment #{deployment.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {deployment.commit_message || deployment.commit_sha}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                        {deployment.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(deployment.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {deployment.public_url && (
                    <a
                      href={deployment.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                      title="View deployment"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <Link
                    to={`/deployments/${deployment.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}