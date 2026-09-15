import { useEffect, useState } from 'react'
import { checkArSupport, type ArSupportResult } from '../lib/ar-support'
import { checkWebXRArSupport } from '../lib/webxr'

const initialResult: ArSupportResult = {
  status: 'unsupported',
  hasCamera: false,
  hasGps: false,
  hasOrientation: false,
  hasHttps: false,
  hasWebXR: false,
  hasImmersiveAr: false,
  isIOS: false,
  isAndroid: false,
  reasons: [],
}

export function useArSupport() {
  const [result, setResult] = useState<ArSupportResult>(initialResult)

  useEffect(() => {
    let cancelled = false

    const detect = async () => {
      const webXR = await checkWebXRArSupport()
      if (!cancelled) setResult(checkArSupport(webXR))
    }

    void detect()
    return () => {
      cancelled = true
    }
  }, [])

  return result
}
