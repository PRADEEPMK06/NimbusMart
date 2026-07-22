import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRepositories } from '../contexts/RepositoryContext'
import { Rocket } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewDeployment() {
  const { repositories, createDeployment } = useRepositories()
  const navigate = useNavigate()
  const [selectedRepo, setSelectedRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [isDeploying, setIsDeploying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRepo) {
      toast.error('Please select a repository')
      return
    }

    setIsDeploying(true)
    try {
      await createDeployment({
        repository_id: parseInt(selectedRepo),
        branch,
      })
      toast.success('Deployment created successfully!')
      navigate('/deployments')
    } catch (error) {
      toast.error('Failed to create deployment')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Deployment</h1>
        <p className="mt-1 text-gray-600">Deploy your repository to Kubernetes</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Repository
            </label>
            <select
              required
              className="input"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              <option value="">Choose a repository...</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Your repository will be cloned</li>
              <li>Technology stack will be detected automatically</li>
              <li>A Docker image will be built and pushed to ECR</li>
              <li>Kubernetes manifests will be generated</li>
              <li>Application will be deployed to EKS</li>
              <li>HTTPS endpoint will be provisioned</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isDeploying || !selectedRepo}
              className="btn btn-primary flex items-center gap-2"
            >
              <Rocket size={20} />
              {isDeploying ? 'Deploying...' : 'Deploy Now'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/deployments')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}