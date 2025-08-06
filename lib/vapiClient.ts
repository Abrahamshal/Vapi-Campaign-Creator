import { ValidatedLead } from './dataValidator'

export interface CampaignCreateResponse {
  success: boolean
  campaignId?: string
  error?: string
  details?: any
}

export interface BatchResult {
  batchNumber: number
  success: boolean
  leadsProcessed: number
  error?: string
}

export interface Assistant {
  id: string
  name: string
  firstMessage?: string
  model?: {
    provider: string
    model: string
  }
}

export interface Workflow {
  id: string
  name: string
  description?: string
  createdAt?: string
}

export interface PhoneNumber {
  id: string
  number: string
  name?: string
  assistantId?: string
  twilioPhoneNumber?: string
  provider?: string
}

export class VapiClient {
  private apiKey: string
  private baseUrl: string = '/api/vapi-proxy'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.apiKey })
      })

      const data = await response.json()
      return data.valid === true
    } catch (error) {
      console.error('API key validation error:', error)
      return false
    }
  }

  async getAssistants(): Promise<Assistant[]> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Vapi-Key': this.apiKey
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch assistants')
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching assistants:', error)
      return []
    }
  }

  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Vapi-Key': this.apiKey
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch workflows')
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return []
    }
  }

  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    try {
      const response = await fetch(`${this.baseUrl}/phone-number`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Vapi-Key': this.apiKey
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch phone numbers')
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching phone numbers:', error)
      return []
    }
  }

  async createCampaign(
    campaignName: string,
    leads: ValidatedLead[],
    assistantId?: string,
    workflowId?: string,
    phoneNumberId?: string,
    onProgress?: (batchNumber: number, totalBatches: number) => void
  ): Promise<CampaignCreateResponse> {
    try {
      const batchSize = 1000
      const batches = this.createBatches(leads, batchSize)
      const batchResults: BatchResult[] = []
      
      // Create the campaign first
      const campaignBody: any = {
        name: campaignName,
        customers: batches[0] // Send first batch with campaign creation
      }
      
      // Add assistant or workflow ID
      if (assistantId) {
        campaignBody.assistantId = assistantId
      } else if (workflowId) {
        campaignBody.workflowId = workflowId
      }
      
      // Add phone number ID if provided
      if (phoneNumberId) {
        campaignBody.phoneNumberId = phoneNumberId
      }
      
      const campaignResponse = await this.sendRequest('campaign', campaignBody)

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json()
        return {
          success: false,
          error: error.message || 'Failed to create campaign'
        }
      }

      const campaignData = await campaignResponse.json()
      const campaignId = campaignData.id

      // Process remaining batches
      for (let i = 1; i < batches.length; i++) {
        if (onProgress) {
          onProgress(i + 1, batches.length)
        }

        // Add delay between batches
        await this.delay(2000)

        const batchResponse = await this.sendRequest(`campaign/${campaignId}/customers`, {
          customers: batches[i]
        })

        batchResults.push({
          batchNumber: i + 1,
          success: batchResponse.ok,
          leadsProcessed: batches[i].length,
          error: !batchResponse.ok ? 'Failed to add batch' : undefined
        })
      }

      return {
        success: true,
        campaignId,
        details: {
          totalLeads: leads.length,
          batches: batchResults
        }
      }
    } catch (error) {
      console.error('Campaign creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  private async sendRequest(endpoint: string, body: any): Promise<Response> {
    return fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vapi-Key': this.apiKey
      },
      body: JSON.stringify(body)
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}