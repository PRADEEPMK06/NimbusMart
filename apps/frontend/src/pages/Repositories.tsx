import { useState } from 'react'
import { useRepositories } from '../contexts/RepositoryContext'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ExternalLink, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Repositories() {
  const { repositories, createRepository, deleteRepository } = useRepositories()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRepo, setNewRepo] = useState({ name: '', url: '' })

  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createRepository({
        name: newRepo.name,
        url: newRepo.url,
      })
      toast.success('Repository added successfully!')
      setNewRepo({ name: '', url: '' })
      setShowAddForm(false)
    } catch (error) {
      toast.error('Failed to add repository')
    }
  }

  const handleDeleteRepository = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this repository?')) {
      try {
        await deleteRepository(id)
        toast.success('Repository deleted')
      } catch (error) {
        toast.error('Failed to delete repository')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
          <p className="mt-1 text-gray-600">Manage your GitHub repositories</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Repository
        </button>
      </div>

      {/* Add Repository Form */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Repository</h2>
          <form onSubmit={handleAddRepository} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository Name
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="owner/repo"
                value={newRepo.name}
                onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub URL
              </label>
              <input
                type="url"
                required
                className="input"
                placeholder="https://github.com/owner/repo"
                value={newRepo.url}
                onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                Add Repository
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Repositories List */}
      <div className="card">
        {repositories.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first GitHub repository</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              Add Your First Repository
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <GitBranch className="text-primary-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{repo.name}</h3>
                    <p className="text-sm text-gray-500">{repo.language || 'Unknown language'}</p>
                    {repo.framework && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {repo.framework}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                    title="View on GitHub"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => handleDeleteRepository(repo.id)}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete repository"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}