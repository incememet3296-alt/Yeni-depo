export {}

declare global {
  interface XRSystem {
    isSessionSupported(mode: string): Promise<boolean>
    requestSession(mode: string, options?: Record<string, unknown>): Promise<XRSession>
  }

  interface XRSession {
    end(): Promise<void>
    addEventListener(type: string, listener: EventListener): void
    removeEventListener(type: string, listener: EventListener): void
  }

  interface Navigator {
    xr?: XRSystem
  }
}
