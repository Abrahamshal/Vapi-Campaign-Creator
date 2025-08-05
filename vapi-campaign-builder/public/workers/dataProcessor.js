// Web Worker for processing large datasets
self.onmessage = function(e) {
  const { type, data, chunkSize } = e.data
  
  if (type === 'process') {
    try {
      processData(data, chunkSize)
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: error.message
      })
    }
  }
}

function processData(data, chunkSize) {
  const total = data.length
  let processed = 0
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    
    // Process chunk (in real app, this would do validation/transformation)
    const processedChunk = chunk.map(item => {
      // Clean and validate data
      return {
        ...item,
        processed: true
      }
    })
    
    // Send results back
    self.postMessage({
      type: 'result',
      payload: processedChunk
    })
    
    // Update progress
    processed = Math.min(i + chunkSize, total)
    self.postMessage({
      type: 'progress',
      payload: { processed, total }
    })
  }
  
  // Send completion message
  self.postMessage({
    type: 'complete'
  })
}