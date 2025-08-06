'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
import { VapiClient, Assistant, Workflow, PhoneNumber } from '@/lib/vapiClient'
import { ChunkProcessor } from '@/lib/chunkProcessor'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info, XCircle, Sparkles, Upload, Settings, Phone, Users, GitBranch } from 'lucide-react'

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
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [selectedType, setSelectedType] = useState<'assistant' | 'workflow'>('assistant')
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('')
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
        
        // Fetch assistants, workflows, and phone numbers
        setLoadingResources(true)
        showAlert('info', 'Loading resources...')
        
        try {
          const [fetchedAssistants, fetchedWorkflows, fetchedPhoneNumbers] = await Promise.all([
            client.getAssistants().catch(err => {
              console.error('Error fetching assistants:', err)
              return []
            }),
            client.getWorkflows().catch(err => {
              console.error('Error fetching workflows:', err)
              return []
            }),
            client.getPhoneNumbers().catch(err => {
              console.error('Error fetching phone numbers:', err)
              return []
            })
          ])
          
          setAssistants(fetchedAssistants)
          setWorkflows(fetchedWorkflows)
          setPhoneNumbers(fetchedPhoneNumbers)
          setLoadingResources(false)
          
          // Check for required resources
          const hasAssistantsOrWorkflows = fetchedAssistants.length > 0 || fetchedWorkflows.length > 0
          const hasPhoneNumbers = fetchedPhoneNumbers.length > 0
          
          if (!hasAssistantsOrWorkflows && !hasPhoneNumbers) {
            showAlert('error', 'Missing required resources', 'You need at least one assistant/workflow AND one phone number in your Vapi account to create campaigns')
          } else if (!hasAssistantsOrWorkflows) {
            showAlert('error', 'No assistants or workflows found', 'Please create an assistant or workflow in your Vapi account first')
          } else if (!hasPhoneNumbers) {
            showAlert('error', 'No phone numbers found', 'Phone numbers are required for campaigns. Please add a phone number in your Vapi account settings before proceeding.')
          } else {
            showAlert('success', 'Resources loaded', `Found ${fetchedAssistants.length} assistants, ${fetchedWorkflows.length} workflows, and ${fetchedPhoneNumbers.length} phone numbers`)
          }
        } catch (fetchError) {
          console.error('Error fetching resources:', fetchError)
          setLoadingResources(false)
          showAlert('warning', 'Could not load all resources', 'Some resources may not be available')
        }
      } else {
        showAlert('error', 'API key validation failed', 'Please check your API key and try again')
      }
      return isValid
    } catch (error) {
      console.error('API validation error:', error)
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

    if (apiKeyValid && !selectedPhoneNumberId) {
      showAlert('warning', 'No phone number selected', 'Please select a phone number to use for outbound calls')
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
        selectedPhoneNumberId,
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
    setSelectedId('')
    setSelectedPhoneNumberId('')
    setAssistants([])
    setWorkflows([])
    setPhoneNumbers([])
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              Vapi Campaign Builder
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your lead lists into powerful Vapi campaigns with intelligent data validation and seamless API integration
          </p>
        </div>

        {alert && (
          <div className="mb-8">
            <Alert 
              className={`border-0 shadow-lg animate-in slide-in-from-top-2 duration-300 ${
                alert.type === 'error' 
                  ? 'bg-red-50 border-red-200/50 shadow-red-100' 
                  : alert.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200/50 shadow-emerald-100'
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200/50 shadow-amber-100'
                  : 'bg-blue-50 border-blue-200/50 shadow-blue-100'
              }`}
              variant={alert.type === 'error' ? 'destructive' : 'default'}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-full ${
                  alert.type === 'error' 
                    ? 'bg-red-100' 
                    : alert.type === 'success'
                    ? 'bg-emerald-100'
                    : alert.type === 'warning'
                    ? 'bg-amber-100'
                    : 'bg-blue-100'
                }`}>
                  {alert.type === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  {alert.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {alert.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                  {alert.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600" />}
                </div>
                <div className="flex-1 pt-0.5">
                  <AlertDescription className={`${
                    alert.type === 'error' 
                      ? 'text-red-800' 
                      : alert.type === 'success'
                      ? 'text-emerald-800'
                      : alert.type === 'warning'
                      ? 'text-amber-800'
                      : 'text-blue-800'
                  }`}>
                    <div className="font-semibold">{alert.message}</div>
                    {alert.details && (
                      <p className="text-sm mt-1 opacity-80">{alert.details}</p>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {appState === 'input' && (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-in fade-in-50 duration-500">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" />
                Campaign Configuration
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure your API settings, select resources, and upload your lead data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* API Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">API Authentication</h3>
                </div>
                <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-100 space-y-4">
                  <div>
                    <Label htmlFor="api-key" className="text-sm font-medium text-gray-700">
                      Vapi API Key
                      {apiKeyValid === true && (
                        <span className="ml-2 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">✓ Valid</span>
                      )}
                      {apiKeyValid === false && (
                        <span className="ml-2 text-red-600 text-xs font-semibold bg-red-50 px-2 py-0.5 rounded-full">✗ Invalid</span>
                      )}
                    </Label>
                    <div className="relative mt-2">
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
                        className="pr-10 h-11 bg-white shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
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
                    <Label htmlFor="campaign-name" className="text-sm font-medium text-gray-700">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      type="text"
                      placeholder="Q1 Outreach Campaign"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-2 h-11 bg-white shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Resource Selection Section */}
              {apiKeyValid && (assistants.length > 0 || workflows.length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      2
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Campaign Resources</h3>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-100 space-y-4">

                    <div>
                      <Label className="text-sm font-medium text-gray-700">Resource Type</Label>
                      <RadioGroup 
                        value={selectedType} 
                        onValueChange={(value) => {
                          setSelectedType(value as 'assistant' | 'workflow')
                          setSelectedId('')
                        }}
                        className="mt-3 grid grid-cols-2 gap-4"
                      >
                        <div className={`relative flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedType === 'assistant' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'
                        } ${assistants.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="assistant" id="assistant" disabled={assistants.length === 0} className="sr-only" />
                          <Users className={`h-5 w-5 ${selectedType === 'assistant' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <Label htmlFor="assistant" className="font-medium cursor-pointer text-sm">
                            Assistant
                            {assistants.length > 0 && (
                              <span className="block text-xs text-gray-500 mt-0.5">{assistants.length} available</span>
                            )}
                          </Label>
                        </div>
                        <div className={`relative flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedType === 'workflow' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'
                        } ${workflows.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="workflow" id="workflow" disabled={workflows.length === 0} className="sr-only" />
                          <GitBranch className={`h-5 w-5 ${selectedType === 'workflow' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <Label htmlFor="workflow" className="font-medium cursor-pointer text-sm">
                            Workflow
                            {workflows.length > 0 && (
                              <span className="block text-xs text-gray-500 mt-0.5">{workflows.length} available</span>
                            )}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Select {selectedType === 'assistant' ? 'Assistant' : 'Workflow'}
                      </Label>
                      <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger className="mt-2 h-11 bg-white shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder={`Choose a ${selectedType}...`} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                          {selectedType === 'assistant' 
                            ? assistants.map((assistant) => (
                                <SelectItem key={assistant.id} value={assistant.id} className="hover:bg-blue-50 focus:bg-blue-50">
                                  {assistant.name || `Assistant ${assistant.id.slice(0, 8)}`}
                                </SelectItem>
                              ))
                            : workflows.map((workflow) => (
                                <SelectItem key={workflow.id} value={workflow.id} className="hover:bg-blue-50 focus:bg-blue-50">
                                  {workflow.name || `Workflow ${workflow.id.slice(0, 8)}`}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Phone Number Selection */}
              {apiKeyValid && phoneNumbers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      3
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Phone Configuration</h3>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <Label className="text-sm font-medium text-gray-700">Outbound Phone Number *</Label>
                    </div>
                    <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId}>
                      <SelectTrigger className="h-11 bg-white shadow-sm border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="Choose a phone number..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        {phoneNumbers.map((phoneNumber) => (
                          <SelectItem key={phoneNumber.id} value={phoneNumber.id} className="hover:bg-emerald-50 focus:bg-emerald-50">
                            {phoneNumber.name ? `${phoneNumber.name} (${phoneNumber.number})` : phoneNumber.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPhoneNumberId && (
                      <p className="text-xs text-emerald-600 mt-2 bg-emerald-50 px-3 py-2 rounded-md">
                        ✓ This number will be used for outbound calls
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show message when phone numbers are missing */}
              {apiKeyValid && phoneNumbers.length === 0 && !loadingResources && (
                <Alert className="bg-red-50 border-red-200/50 shadow-red-100">
                  <div className="p-1 rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <AlertDescription className="text-red-800">
                    <div className="font-semibold">Phone Number Required</div>
                    <p className="text-sm mt-1 opacity-80">You must add a phone number in your Vapi account to create campaigns. Visit your Vapi dashboard → Phone Numbers → Add Phone Number.</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* File Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    4
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Lead Data Upload</h3>
                </div>
                <div className="bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Upload className="h-4 w-4 text-orange-600" />
                    <Label className="text-sm font-medium text-gray-700">Upload Lead List</Label>
                  </div>
                  <FileUpload onFileSelect={handleFileSelect} />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                  onClick={handleStartProcessing}
                  disabled={!apiKey || !campaignName || !file || isProcessing || loadingResources || (apiKeyValid === true && (!selectedId || !selectedPhoneNumberId))}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:shadow-md"
                  title={
                    !apiKey ? 'Please enter an API key' :
                    !campaignName ? 'Please enter a campaign name' :
                    !file ? 'Please select a file' :
                    loadingResources ? 'Loading resources...' :
                    apiKeyValid === true && !selectedId ? 'Please select an assistant or workflow' :
                    apiKeyValid === true && !selectedPhoneNumberId ? 'Please select a phone number' :
                    'Click to validate data'
                  }
                >
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : loadingResources ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Loading Resources...
                      </>
                    ) : file ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Validate Data
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Start Campaign Creation
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </CardContent>
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