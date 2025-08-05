'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ColumnDetection } from '@/lib/fileParser'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface FieldMapperProps {
  headers: string[]
  detections: ColumnDetection[]
  sampleData: Record<string, any>[]
  onMappingChange: (mapping: {
    phoneColumn: string
    nameColumn?: string
    emailColumn?: string
  }) => void
}

export function FieldMapper({
  headers,
  detections,
  sampleData,
  onMappingChange
}: FieldMapperProps) {
  const [phoneColumn, setPhoneColumn] = useState('')
  const [nameColumn, setNameColumn] = useState('')
  const [emailColumn, setEmailColumn] = useState('')

  useEffect(() => {
    // Set initial values from detection
    const phoneDetection = detections.find(d => d.field === 'phone')
    const nameDetection = detections.find(d => d.field === 'name')
    const emailDetection = detections.find(d => d.field === 'email')

    setPhoneColumn(phoneDetection?.detectedColumn || '')
    setNameColumn(nameDetection?.detectedColumn || '')
    setEmailColumn(emailDetection?.detectedColumn || '')
  }, [detections])

  useEffect(() => {
    onMappingChange({
      phoneColumn,
      nameColumn: nameColumn || undefined,
      emailColumn: emailColumn || undefined
    })
  }, [phoneColumn, nameColumn, emailColumn, onMappingChange])

  const getSampleValue = (column: string) => {
    if (!column || !sampleData[0]) return ''
    return sampleData[0][column] || ''
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (confidence >= 0.5) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
    return null
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Map Your Data Fields</h3>
      <p className="text-sm text-gray-600 mb-6">
        Detected {sampleData.length.toLocaleString()} rows
      </p>

      <div className="space-y-4">
        {/* Phone Column */}
        <div>
          <Label htmlFor="phone-column" className="flex items-center gap-2">
            Phone Column *
            {detections.find(d => d.field === 'phone')?.confidence && 
              getConfidenceIcon(detections.find(d => d.field === 'phone')!.confidence)}
          </Label>
          <select
            id="phone-column"
            value={phoneColumn}
            onChange={(e) => setPhoneColumn(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select column...</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
          {phoneColumn && (
            <p className="text-xs text-gray-500 mt-1">
              Sample: {getSampleValue(phoneColumn)}
            </p>
          )}
        </div>

        {/* Name Column */}
        <div>
          <Label htmlFor="name-column" className="flex items-center gap-2">
            Name Column
            {detections.find(d => d.field === 'name')?.confidence && 
              getConfidenceIcon(detections.find(d => d.field === 'name')!.confidence)}
          </Label>
          <select
            id="name-column"
            value={nameColumn}
            onChange={(e) => setNameColumn(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select column (optional)...</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
          {nameColumn && (
            <p className="text-xs text-gray-500 mt-1">
              Sample: {getSampleValue(nameColumn)}
            </p>
          )}
        </div>

        {/* Email Column */}
        <div>
          <Label htmlFor="email-column" className="flex items-center gap-2">
            Email Column
            {detections.find(d => d.field === 'email')?.confidence && 
              getConfidenceIcon(detections.find(d => d.field === 'email')!.confidence)}
          </Label>
          <select
            id="email-column"
            value={emailColumn}
            onChange={(e) => setEmailColumn(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select column (optional)...</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
          {emailColumn && (
            <p className="text-xs text-gray-500 mt-1">
              Sample: {getSampleValue(emailColumn)}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}