import api from './api'
import { Repository, Deployment } from '../types'

export const repositoryService = {
  async getRepositories(): Promise<Repository[]> {
    const response = await api.get<Repository[]>('/repositories')
    return response.data
  },

  async getRepository(id: number): Promise<Repository> {
    const response = await api.get<Repository>(`/repositories/${id}`)
    return response.data
  },

  async createRepository(data: {
    name: string
    url: string
    github_id?: string
    default_branch?: string
    language?: string
    framework?: string
  }): Promise<Repository> {
    const response = await api.post<Repository>('/repositories', data)
    return response.data
  },

  async updateRepository(id: number, data: {
    name?: string
    language?: string
    framework?: string
    is_active?: boolean
  }): Promise<Repository> {
    const response = await api.patch<Repository>(`/repositories/${id}`, data)
    return response.data
  },

  async deleteRepository(id: number): Promise<void> {
    await api.delete(`/repositories/${id}`)
  },
}

export const deploymentService = {
  async getDeployments(): Promise<Deployment[]> {
    const response = await api.get<Deployment[]>('/deployments')
    return response.data
  },

  async getDeployment(id: number): Promise<Deployment> {
    const response = await api.get<Deployment>(`/deployments/${id}`)
    return response.data
  },

  async createDeployment(data: {
    repository_id: number
    branch?: string
    environment_vars?: Record<string, string>
    secrets?: Record<string, string>
  }): Promise<Deployment> {
    const response = await api.post<Deployment>('/deployments', data)
    return response.data
  },

  async restartDeployment(id: number): Promise<void> {
    await api.post(`/deployments/${id}/restart`)
  },

  async scaleDeployment(id: number, replicas: number): Promise<void> {
    await api.post(`/deployments/${id}/scale`, null, { params: { replicas } })
  },

  async deleteDeployment(id: number): Promise<void> {
    await api.delete(`/deployments/${id}`)
  },

  async getDeploymentLogs(id: number): Promise<{ logs: string[]; status: string }> {
    const response = await api.get(`/deployments/${id}/logs`)
    return response.data
  },
}