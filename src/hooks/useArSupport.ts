import { useEffect, useState } from 'react'
import { checkArSupport, type ArSupportResult } from '../lib/ar-support'

export function useArSupport() {
  const [result, setResult] = useState<ArSupportResult>({
    status: 'checking',
    hasCamera: false,
    hasGps: false,
    hasOrientation: false,
    hasHttps: false,
    reasons: [],
  })

  useEffect(() => {
    const check = () => {
      setResult(checkArSupport())
    }
    check()
  }, [])

  return result
}
