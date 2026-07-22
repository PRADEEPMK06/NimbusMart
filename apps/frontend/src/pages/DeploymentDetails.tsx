import { useParams, Link } from 'react-router-dom'
import { useRepositories } from '../contexts/RepositoryContext'
import { 
  ExternalLink, 
  ArrowLeft, 
  Play, 
  Square, 
  Trash2, 
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Loader
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeploymentDetails() {
  const { id } = useParams<{ id: string }>()
  const { deployments } = useRepositories()
  const deployment = deployments.find(d => d.id === parseInt(id || '0'))

  if (!deployment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Deployment not found</p>
        <Link to="/deployments" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to deployments
        </Link>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="text-green-600" size={24} />
      case 'failed':
        return <XCircle className="text-red-600" size={24} />
      case 'building':
      case 'deploying':
        return <Loader className="text-yellow-600 animate-spin" size={24} />
      default:
        return <Clock className="text-gray-600" size={24} />
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/deployments" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Deployment #{deployment.id}</h1>
          <p className="mt-1 text-gray-600">
            {deployment.commit_message || deployment.commit_sha}
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(deployment.status)}
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deployment.status)}`}>
                {deployment.status}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                Created {new Date(deployment.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deployment.public_url && (
              <a
                href={deployment.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary flex items-center gap-2"
              >
                <ExternalLink size={18} />
                View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Deployment Info</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Commit SHA</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                  {deployment.commit_sha}
                </code>
                <button
                  onClick={() => copyToClipboard(deployment.commit_sha)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Branch</p>
              <p className="text-sm font-medium">{deployment.branch}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Image Tag</p>
              <p className="text-sm font-medium">{deployment.image_tag || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Namespace</p>
              <p className="text-sm font-medium">{deployment.kubernetes_ns || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">URLs</h3>
          <div className="space-y-3">
            {deployment.public_url && (
              <div>
                <p className="text-sm text-gray-600">Public URL</p>
                <a
                  href={deployment.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 break-all"
                >
                  {deployment.public_url}
                </a>
              </div>
            )}
            {deployment.dashboard_url && (
              <div>
                <p className="text-sm text-gray-600">Dashboard URL</p>
                <a
                  href={deployment.dashboard_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 break-all"
                >
                  {deployment.dashboard_url}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary flex items-center gap-2">
            <Play size={18} />
            Restart
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Square size={18} />
            Stop
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Copy size={18} />
            Clone
          </button>
          <button className="btn btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50">
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}