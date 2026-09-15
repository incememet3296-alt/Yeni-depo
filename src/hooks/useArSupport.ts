import { useEffect, useState } from 'react'
import { checkArSupport, type ArSupportResult } from '../lib/ar-support'

const initialResult: ArSupportResult = {
  status: 'unsupported',
  hasCamera: false,
  hasGps: false,
  hasOrientation: false,
  hasHttps: false,
  isIOS: false,
  isAndroid: false,
  reasons: [],
}

export function useArSupport() {
  const [result, setResult] = useState<ArSupportResult>(initialResult)

  useEffect(() => {
    setResult(checkArSupport())
  }, [])

  return result
}
