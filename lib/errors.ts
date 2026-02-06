export class ApiError extends Error {
  public readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export class AuditError extends Error {
  public readonly failedCollectors: readonly string[]

  constructor(message: string, failedCollectors: readonly string[]) {
    super(message)
    this.name = 'AuditError'
    this.failedCollectors = failedCollectors
  }
}

export class CollectorError extends Error {
  public readonly collector: string
  public readonly tier: 'required' | 'optional'

  constructor(
    collector: string,
    tier: 'required' | 'optional',
    message: string,
  ) {
    super(message)
    this.name = 'CollectorError'
    this.collector = collector
    this.tier = tier
  }
}

export class TimeoutError extends Error {
  public readonly label: string
  public readonly timeoutMs: number

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.label = label
    this.timeoutMs = timeoutMs
  }
}
