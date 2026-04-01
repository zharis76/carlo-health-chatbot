export type ComplianceStatus = 'pass' | 'warn' | 'blocked' | 'pending' | 'bypass'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  compliance?: ComplianceStatus
  complianceScore?: number
  riskScore?: number
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface CarloResult {
  compliant: boolean
  score: number
  risk: number
  reason?: string
  flagged_categories?: string[]
}

export interface ComplianceSummary {
  totalChecks: number
  avgCompliance: number
  avgRisk: number
  isConfigured: boolean
}
