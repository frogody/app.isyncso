import { describe, it, expect } from 'vitest'
import { createPageUrl } from '@/utils'

describe('createPageUrl', () => {
  it('should create URL for page name', () => {
    const url = createPageUrl('Candidates')
    expect(url).toBe('/candidates')
  })

  it('should handle spaces in page names', () => {
    const url = createPageUrl('Candidate Profile')
    expect(url).toBe('/candidate-profile')
  })

  it('should lowercase the page name', () => {
    const url = createPageUrl('Dashboard')
    expect(url).toBe('/dashboard')
  })
})
