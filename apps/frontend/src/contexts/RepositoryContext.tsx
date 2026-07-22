import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Repository, Deployment } from '../types'
import * as repositoryService from '../services/repositories'

interface RepositoryContextType {
  repositories: Repository[]
  deployments: Deployment[]
  selectedRepository: Repository | null
  selectedDeployment: Deployment | null
  setSelectedRepository: (repo: Repository | null) => void
  setSelectedDeployment: (deployment: Deployment | null) => void
  refreshRepositories: () => Promise<void>
  refreshDeployments: () => Promise<void>
  createRepository: (data: {
    name: string
    url: string
    github_id?: string
    default_branch?: string
    language?: string
    framework?: string
  }) => Promise<Repository>
  deleteRepository: (id: number) => Promise<void>
  createDeployment: (data: {
    repository_id: number
    branch?: string
    environment_vars?: Record<string, string>
    secrets?: Record<string, string>
  }) => Promise<Deployment>
  isLoading: boolean
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined)

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null)
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshRepositories = async () => {
    try {
      const repos = await repositoryService.getRepositories()
      setRepositories(repos)
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
    }
  }

  const refreshDeployments = async () => {
    try {
      const deps = await repositoryService.getDeployments()
      setDeployments(deps)
    } catch (error) {
      console.error('Failed to fetch deployments:', error)
    }
  }

  const createRepository = async (data: {
    name: string
    url: string
    github_id?: string
    default_branch?: string
    language?: string
    framework?: string
  }): Promise<Repository> => {
    const repo = await repositoryService.createRepository(data)
    setRepositories(prev => [...prev, repo])
    return repo
  }

  const deleteRepository = async (id: number): Promise<void> => {
    await repositoryService.deleteRepository(id)
    setRepositories(prev => prev.filter(r => r.id !== id))
  }

  const createDeployment = async (data: {
    repository_id: number
    branch?: string
    environment_vars?: Record<string, string>
    secrets?: Record<string, string>
  }): Promise<Deployment> => {
    const deployment = await repositoryService.createDeployment(data)
    setDeployments(prev => [deployment, ...prev])
    return deployment
  }

  useEffect(() => {
    refreshRepositories()
    refreshDeployments()
    setIsLoading(false)
  }, [])

  return (
    <RepositoryContext.Provider value={{
      repositories,
      deployments,
      selectedRepository,
      selectedDeployment,
      setSelectedRepository,
      setSelectedDeployment,
      refreshRepositories,
      refreshDeployments,
      createRepository,
      deleteRepository,
      createDeployment,
      isLoading
    }}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepositories() {
  const context = useContext(RepositoryContext)
  if (context === undefined) {
    throw new Error('useRepositories must be used within a RepositoryProvider')
  }
  return context
}