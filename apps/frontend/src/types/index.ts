export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'developer' | 'viewer'
  github_id?: string
  github_username?: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface Repository {
  id: number
  user_id: number
  name: string
  url: string
  github_id?: string
  default_branch: string
  language?: string
  framework?: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_deployed?: string
}

export interface Deployment {
  id: number
  user_id: number
  repository_id: number
  commit_sha: string
  commit_message?: string
  branch: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed'
  public_url?: string
  dashboard_url?: string
  image_tag?: string
  kubernetes_ns?: string
  helm_release?: string
  started_at?: string
  completed_at?: string
  duration_secs?: number
  error_message?: string
  created_at: string
}

export interface Product {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  category?: string
  emoji?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: number
  session_id: string
  product_id: number
  quantity: number
  added_at: string
  updated_at: string
  product?: Product
}

export interface CartSummary {
  items: CartItem[]
  item_count: number
  total_price: number
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface APIKey {
  id: number
  name: string
  key_prefix: string
  created_at: string
  expires_at?: string
  last_used?: string
  is_active: boolean
}