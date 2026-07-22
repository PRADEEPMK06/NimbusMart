import api from './api'
import { User, Token, APIKey } from '../types'

export const authService = {
  async login(email: string, password: string): Promise<Token> {
    const response = await api.post<Token>('/auth/login', { email, password })
    return response.data
  },

  async register(email: string, password: string, fullName: string): Promise<User> {
    const response = await api.post<User>('/auth/register', { email, password, full_name: fullName })
    return response.data
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<Token> {
    const response = await api.post<Token>('/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },

  async createApiKey(name: string, expiresInDays: number = 365): Promise<APIKey> {
    const response = await api.post<APIKey>('/auth/api-keys', { name, expires_in_days: expiresInDays })
    return response.data
  },

  async getApiKeys(): Promise<APIKey[]> {
    const response = await api.get<APIKey[]>('/auth/api-keys')
    return response.data
  },

  async revokeApiKey(apiKeyId: number): Promise<void> {
    await api.delete(`/auth/api-keys/${apiKeyId}`)
  },
}