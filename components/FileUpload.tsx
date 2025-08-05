'use client'

import { useCallback, useState } from 'react'
import { Upload, X, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function FileUpload({
  onFileSelect,
  accept = '.csv,.xlsx,.xls',
  maxSize = 50,
  className
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): boolean => {
    setError(null)
    
    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`)
      return false
    }
    
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase()
    const acceptedExtensions = accept.split(',').map(ext => ext.replace('.', ''))
    if (extension && !acceptedExtensions.includes(extension)) {
      setError('Please upload a CSV or Excel file')
      return false
    }
    
    return true
  }

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect, maxSize])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }, [handleFile])

  const removeFile = () => {
    setFile(null)
    setError(null)
  }

  return (
    <div className={cn('w-full', className)}>
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400',
            error && 'border-destructive'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="h-10 w-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Drop Excel/CSV here</p>
              <p className="text-xs text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Max: 100,000 rows</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}