export interface ChunkProcessorOptions {
  chunkSize: number
  yieldInterval: number
  useWebWorker: boolean
  memoryThreshold: number
  onProgress?: (processed: number, total: number) => void
}

export class ChunkProcessor {
  private options: ChunkProcessorOptions
  private worker: Worker | null = null

  constructor(options: Partial<ChunkProcessorOptions> = {}) {
    this.options = {
      chunkSize: 1000,
      yieldInterval: 50,
      useWebWorker: true,
      memoryThreshold: 500,
      ...options
    }
  }

  async processData<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]> | R[]
  ): Promise<R[]> {
    // Check if we should use Web Worker
    if (this.options.useWebWorker && data.length > 10000 && typeof Worker !== 'undefined') {
      return this.processWithWebWorker(data, processor)
    }
    
    // Otherwise use chunked processing
    return this.processInChunks(data, processor)
  }

  private async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]> | R[]
  ): Promise<R[]> {
    const results: R[] = []
    const { chunkSize, yieldInterval, onProgress } = this.options
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      const chunkResults = await processor(chunk)
      results.push(...chunkResults)
      
      if (onProgress) {
        onProgress(Math.min(i + chunkSize, data.length), data.length)
      }
      
      // Yield control back to browser
      await this.yield(yieldInterval)
    }
    
    return results
  }

  private async processWithWebWorker<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]> | R[]
  ): Promise<R[]> {
    return new Promise((resolve, reject) => {
      // Create worker if not exists
      if (!this.worker) {
        this.worker = new Worker('/workers/dataProcessor.js')
      }
      
      const results: R[] = []
      
      this.worker.onmessage = (e) => {
        const { type, payload } = e.data
        
        switch (type) {
          case 'progress':
            if (this.options.onProgress) {
              this.options.onProgress(payload.processed, payload.total)
            }
            break
          case 'result':
            results.push(...payload)
            break
          case 'complete':
            resolve(results)
            break
          case 'error':
            reject(new Error(payload))
            break
        }
      }
      
      this.worker.onerror = (error) => {
        reject(error)
      }
      
      // Send data to worker
      this.worker.postMessage({
        type: 'process',
        data,
        chunkSize: this.options.chunkSize
      })
    })
  }

  private yield(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  checkMemoryUsage(): boolean {
    if ('performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024
      return usedMB < this.options.memoryThreshold
    }
    return true // Can't check, assume OK
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}