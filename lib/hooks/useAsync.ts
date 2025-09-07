import { useState, useEffect, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
}

interface UseAsyncOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: UseAsyncOptions = {}
) {
  const { immediate = true, onSuccess, onError } = options
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: immediate
  })

  const execute = useCallback(async () => {
    setState({ data: null, error: null, isLoading: true })
    
    try {
      const result = await asyncFunction()
      setState({ data: result, error: null, isLoading: false })
      onSuccess?.(result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setState({ data: null, error: err, isLoading: false })
      onError?.(err)
      throw err
    }
  }, dependencies)

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

// Hook for handling form submissions with loading states
export function useAsyncSubmit<T = any>(
  submitFunction: (data: any) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { onSuccess, onError } = options

  const submit = useCallback(async (data: any) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await submitFunction(data)
      onSuccess?.(result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Submission failed')
      setError(err)
      onError?.(err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [submitFunction, onSuccess, onError])

  const reset = useCallback(() => {
    setError(null)
    setIsSubmitting(false)
  }, [])

  return {
    submit,
    isSubmitting,
    error,
    reset
  }
}