'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/FileUpload'
import { FieldMapper } from '@/components/FieldMapper'
import { ProgressTracker, ProgressStep } from '@/components/ProgressTracker'
import { ResultSummary } from '@/components/ResultSummary'
import { parseFile, detectColumns, extractDataByColumns } from '@/lib/fileParser'
import { validateAndCleanData } from '@/lib/dataValidator'
import { VapiClient, Assistant, Workflow } from '@/lib/vapiClient'
import { ChunkProcessor } from '@/lib/chunkProcessor'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

type AppState = 'input' | 'mapping' | 'processing' | 'complete'
type AlertType = 'error' | 'success' | 'info' | 'warning'

interface AlertMessage {
  type: AlertType
  message: string
  details?: string
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('input')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<any>(null)
  const [processSteps, setProcessSteps] = useState<ProgressStep[]>([])
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [alert, setAlert] = useState<AlertMessage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // New state for assistants and workflows
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedType, setSelectedType] = useState<'assistant' | 'workflow'>('assistant')
  const [selectedId, setSelectedId] = useState<string>('')
  const [loadingResources, setLoadingResources] = useState(false)

  const showAlert = (type: AlertType, message: string, details?: string) => {
    setAlert({ type, message, details })
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => setAlert(null), 5000)
    }
  }

  const validateApiKey = async () => {
    // Vapi API keys are UUIDs in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(apiKey)) {
      setApiKeyValid(false)
      showAlert('error', 'Invalid API key format', 'API key should be a valid UUID (e.g., a9bab1b8-c325-4705-bc57-9a07259f8129)')
      return false
    }

    try {
      const client = new VapiClient(apiKey)
      const isValid = await client.validateApiKey()
      setApiKeyValid(isValid)
      
      if (isValid) {
        showAlert('success', 'API key validated successfully')
        
        // Fetch assistants and workflows
        setLoadingResources(true)
        showAlert('info', 'Loading assistants and workflows...')
        
        const [fetchedAssistants, fetchedWorkflows] = await Promise.all([
          client.getAssistants(),
          client.getWorkflows()
        ])
        
        setAssistants(fetchedAssistants)
        setWorkflows(fetchedWorkflows)
        setLoadingResources(false)
        
        if (fetchedAssistants.length === 0 && fetchedWorkflows.length === 0) {
          showAlert('warning', 'No assistants or workflows found', 'Please create an assistant or workflow in your Vapi account first')
        } else {
          showAlert('success', 'Resources loaded', `Found ${fetchedAssistants.length} assistants and ${fetchedWorkflows.length} workflows`)
        }
      } else {
        showAlert('error', 'API key validation failed', 'Please check your API key and try again')
      }
      return isValid
    } catch (error) {
      showAlert('error', 'Failed to validate API key', 'Network error or server issue')
      return false
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setAlert(null)
    
    try {
      showAlert('info', 'Parsing file...', `Reading ${selectedFile.name}`)
      const data = await parseFile(selectedFile)
      const detections = detectColumns(data.headers)
      
      setParsedData({
        ...data,
        detections
      })
      showAlert('success', 'File parsed successfully', `Found ${data.totalRows} rows with ${data.headers.length} columns`)
    } catch (err) {
      showAlert('error', 'Failed to parse file', 'Please ensure the file is a valid CSV or Excel file with data')
      setFile(null)
      setParsedData(null)
    }
  }

  const handleStartProcessing = async () => {
    if (!apiKey || !campaignName || !file) {
      showAlert('warning', 'Missing required fields', 'Please enter API key, campaign name, and select a file')
      return
    }

    if (apiKeyValid && !selectedId) {
      showAlert('warning', 'No assistant or workflow selected', `Please select an ${selectedType} to use for the campaign`)
      return
    }

    // Show loading state
    setAlert(null)
    setIsProcessing(true)

    try {
      // Validate API key
      showAlert('info', 'Validating API key...')
      const isValid = await validateApiKey()
      if (!isValid) {
        setIsProcessing(false)
        return
      }

      // Parse file if not already parsed
      if (!parsedData) {
        showAlert('warning', 'File is still being processed', 'Please wait for file parsing to complete')
        setIsProcessing(false)
        return
      }

      // Move to mapping state
      showAlert('success', 'Ready to map columns', 'Please verify the detected columns are correct')
      setAppState('mapping')
    } catch (err) {
      showAlert('error', 'Unexpected error', err instanceof Error ? err.message : 'Please try again')
      console.error('Validation error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessData = async () => {
    if (!columnMapping?.phoneColumn) {
      showAlert('warning', 'Phone column required', 'Please select which column contains phone numbers')
      return
    }

    setAppState('processing')
    setIsProcessing(true)
    setAlert(null)

    const steps: ProgressStep[] = [
      { label: 'Extracting data', status: 'in-progress' },
      { label: 'Validating phone numbers', status: 'pending' },
      { label: 'Removing duplicates', status: 'pending' },
      { label: 'Creating campaign', status: 'pending' },
      { label: 'Uploading leads', status: 'pending' }
    ]
    setProcessSteps(steps)

    try {
      const processor = new ChunkProcessor({
        chunkSize: 1000,
        useWebWorker: parsedData.totalRows > 10000,
        onProgress: (processed, total) => {
          setProgress(Math.round((processed / total) * 20))
        }
      })

      // Step 1: Extract data
      const extractedData = extractDataByColumns(
        parsedData.rows,
        columnMapping.phoneColumn,
        columnMapping.nameColumn,
        columnMapping.emailColumn
      )

      steps[0].status = 'completed'
      steps[0].detail = `${extractedData.length} rows extracted`
      steps[1].status = 'in-progress'
      setProcessSteps([...steps])
      setProgress(20)

      // Step 2-3: Validate and clean data
      const validationResult = await processor.processData(
        [extractedData],
        async (chunk) => {
          const result = validateAndCleanData(chunk[0])
          return [result]
        }
      )

      const validation = validationResult[0]
      
      steps[1].status = 'completed'
      steps[1].detail = `${validation.valid.length} valid numbers`
      steps[2].status = 'completed'
      steps[2].detail = `${validation.duplicates} duplicates removed`
      steps[3].status = 'in-progress'
      setProcessSteps([...steps])
      setProgress(40)

      // Step 4-5: Create campaign and upload leads
      const client = new VapiClient(apiKey)
      const campaignResult = await client.createCampaign(
        campaignName,
        validation.valid,
        selectedType === 'assistant' ? selectedId : undefined,
        selectedType === 'workflow' ? selectedId : undefined,
        (batch: number, total: number) => {
          const batchProgress = 40 + Math.round((batch / total) * 60)
          setProgress(batchProgress)
          steps[4].status = 'in-progress'
          steps[4].detail = `Batch ${batch} of ${total}`
          setProcessSteps([...steps])
        }
      )

      if (campaignResult.success) {
        steps[3].status = 'completed'
        steps[4].status = 'completed'
        steps[4].detail = `${validation.valid.length} leads uploaded`
        setProcessSteps([...steps])
        setProgress(100)

        setResult({
          success: true,
          campaignId: campaignResult.campaignId,
          ...validation.summary,
          errors: validation.invalid
        })
      } else {
        throw new Error(campaignResult.error || 'Failed to create campaign')
      }

      processor.destroy()
      setAppState('complete')
      showAlert('success', 'Campaign created successfully!', `${validation.valid.length} leads uploaded`)
    } catch (err) {
      showAlert('error', 'Failed to create campaign', err instanceof Error ? err.message : 'An unexpected error occurred')
      setAppState('input')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadReport = () => {
    if (!result) return

    const report = {
      campaignName,
      campaignId: result.campaignId,
      timestamp: new Date().toISOString(),
      summary: {
        totalRows: result.totalRows,
        validLeads: result.validRows,
        invalidLeads: result.invalidRows,
        duplicates: result.duplicateRows
      },
      errors: result.errors
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateAnother = () => {
    setAppState('input')
    setApiKey('')
    setApiKeyValid(null)
    setCampaignName('')
    setFile(null)
    setParsedData(null)
    setColumnMapping(null)
    setProcessSteps([])
    setProgress(0)
    setResult(null)
    setAlert(null)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Vapi Campaign Builder</h1>
          <p className="text-gray-600">
            Create Vapi campaigns easily by uploading your lead list
          </p>
        </div>

        {alert && (
          <Alert 
            className={`mb-6 ${
              alert.type === 'error' 
                ? 'bg-gray-900 border-gray-700 text-red-500' 
                : alert.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : alert.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
            variant={alert.type === 'error' ? 'destructive' : 'default'}
          >
            <div className="flex items-start gap-2">
              {alert.type === 'error' && <XCircle className="h-4 w-4 mt-0.5" />}
              {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
              {alert.type === 'info' && <Info className="h-4 w-4 mt-0.5" />}
              {alert.type === 'warning' && <AlertCircle className="h-4 w-4 mt-0.5" />}
              <div className="flex-1">
                <AlertDescription className={alert.type === 'error' ? 'text-red-400' : ''}>
                  <strong>{alert.message}</strong>
                  {alert.details && (
                    <p className="text-sm mt-1 opacity-90">{alert.details}</p>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {appState === 'input' && (
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="api-key">
                  API Key
                  {apiKeyValid === true && (
                    <span className="ml-2 text-green-600 text-xs">✓ Valid</span>
                  )}
                  {apiKeyValid === false && (
                    <span className="ml-2 text-destructive text-xs">✗ Invalid</span>
                  )}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setApiKeyValid(null)
                    }}
                    onBlur={validateApiKey}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  type="text"
                  placeholder="Q1 Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Assistant/Workflow Selection */}
              {apiKeyValid && (assistants.length > 0 || workflows.length > 0) && (
                <>
                  <div>
                    <Label>Select Type</Label>
                    <RadioGroup 
                      value={selectedType} 
                      onValueChange={(value) => {
                        setSelectedType(value as 'assistant' | 'workflow')
                        setSelectedId('') // Reset selection when type changes
                      }}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="assistant" id="assistant" disabled={assistants.length === 0} />
                        <Label htmlFor="assistant" className="font-normal cursor-pointer">
                          Assistant {assistants.length > 0 && `(${assistants.length})`}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="workflow" id="workflow" disabled={workflows.length === 0} />
                        <Label htmlFor="workflow" className="font-normal cursor-pointer">
                          Workflow {workflows.length > 0 && `(${workflows.length})`}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>
                      Select {selectedType === 'assistant' ? 'Assistant' : 'Workflow'}
                    </Label>
                    <Select value={selectedId} onValueChange={setSelectedId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Choose a ${selectedType}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedType === 'assistant' 
                          ? assistants.map((assistant) => (
                              <SelectItem key={assistant.id} value={assistant.id}>
                                {assistant.name || `Assistant ${assistant.id.slice(0, 8)}`}
                              </SelectItem>
                            ))
                          : workflows.map((workflow) => (
                              <SelectItem key={workflow.id} value={workflow.id}>
                                {workflow.name || `Workflow ${workflow.id.slice(0, 8)}`}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <FileUpload onFileSelect={handleFileSelect} />

              <Button
                onClick={handleStartProcessing}
                disabled={!apiKey || !campaignName || !file || isProcessing || (apiKeyValid === true && !selectedId)}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : file ? 'Validate Data' : 'Create Campaign'}
              </Button>
            </div>
          </Card>
        )}

        {appState === 'mapping' && parsedData && (
          <div className="space-y-6">
            <FieldMapper
              headers={parsedData.headers}
              detections={parsedData.detections}
              sampleData={parsedData.rows.slice(0, 3)}
              onMappingChange={setColumnMapping}
            />
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAppState('input')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleProcessData}
                disabled={!columnMapping?.phoneColumn}
                className="flex-1"
              >
                Process Data
              </Button>
            </div>
          </div>
        )}

        {appState === 'processing' && (
          <ProgressTracker
            steps={processSteps}
            progress={progress}
          />
        )}

        {appState === 'complete' && result && (
          <ResultSummary
            success={result.success}
            campaignId={result.campaignId}
            totalLeads={result.totalRows}
            validLeads={result.validRows}
            invalidLeads={result.invalidRows}
            duplicates={result.duplicateRows}
            timeElapsed="2m 34s"
            errors={result.errors}
            onDownloadReport={handleDownloadReport}
            onCreateAnother={handleCreateAnother}
          />
        )}
      </div>
    </main>
  )
}