'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle, Loader2, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface ProgressStep {
  label: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  detail?: string
}

interface ProgressTrackerProps {
  steps: ProgressStep[]
  progress: number
  timeElapsed?: string
  estimatedRemaining?: string
}

export function ProgressTracker({
  steps,
  progress,
  timeElapsed,
  estimatedRemaining
}: ProgressTrackerProps) {
  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
      case 'error':
        return <div className="h-5 w-5 rounded-full bg-destructive" />
      default:
        return null
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Processing Your Campaign</h3>
      
      <Progress value={progress} className="mb-6" />
      <p className="text-sm text-center text-gray-600 mb-6">{progress}%</p>

      <div className="space-y-3 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            {getStepIcon(step.status)}
            <div className="flex-1">
              <p className={`text-sm ${
                step.status === 'completed' ? 'text-gray-600' :
                step.status === 'in-progress' ? 'font-medium' :
                'text-gray-400'
              }`}>
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-gray-500">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {(timeElapsed || estimatedRemaining) && (
        <div className="flex justify-between text-sm text-gray-600 pt-4 border-t">
          {timeElapsed && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Time elapsed: {timeElapsed}</span>
            </div>
          )}
          {estimatedRemaining && (
            <span>Est. remaining: {estimatedRemaining}</span>
          )}
        </div>
      )}
    </Card>
  )
}