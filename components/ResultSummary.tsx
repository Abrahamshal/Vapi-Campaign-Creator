'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Download, RefreshCw } from 'lucide-react'

interface ResultSummaryProps {
  success: boolean
  campaignId?: string
  totalLeads: number
  validLeads: number
  invalidLeads: number
  duplicates: number
  timeElapsed: string
  errors?: Array<{
    rowIndex: number
    errors: string[]
  }>
  onDownloadReport?: () => void
  onCreateAnother?: () => void
}

export function ResultSummary({
  success,
  campaignId,
  totalLeads,
  validLeads,
  invalidLeads,
  duplicates,
  timeElapsed,
  errors = [],
  onDownloadReport,
  onCreateAnother
}: ResultSummaryProps) {
  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        {success ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Campaign Created!</h2>
          </>
        ) : (
          <>
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Campaign Failed</h2>
          </>
        )}
      </div>

      <div className="space-y-3 mb-6">
        {campaignId && (
          <div className="flex justify-between">
            <span className="text-gray-600">Campaign ID:</span>
            <span className="font-mono text-sm">{campaignId}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Total Leads:</span>
          <span className="font-semibold">{totalLeads.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Valid Leads:</span>
          <span className="font-semibold text-green-600">
            {validLeads.toLocaleString()}
          </span>
        </div>
        
        {invalidLeads > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Invalid Leads:</span>
            <span className="font-semibold text-destructive">
              {invalidLeads.toLocaleString()}
            </span>
          </div>
        )}
        
        {duplicates > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Duplicates Removed:</span>
            <span className="font-semibold text-yellow-600">
              {duplicates.toLocaleString()}
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Time Taken:</span>
          <span>{timeElapsed}</span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-destructive/10 rounded-md">
          <h4 className="text-sm font-semibold mb-2">Errors Found:</h4>
          <div className="max-h-40 overflow-y-auto">
            {errors.slice(0, 5).map((error, index) => (
              <div key={index} className="text-xs text-gray-700 mb-1">
                Row {error.rowIndex}: {error.errors.join(', ')}
              </div>
            ))}
            {errors.length > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                ...and {errors.length - 5} more errors
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {onCreateAnother && (
          <Button onClick={onCreateAnother} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Create Another
          </Button>
        )}
        
        {onDownloadReport && (
          <Button onClick={onDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        )}
      </div>
    </Card>
  )
}