import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { projectConfig } from '@app/config'
import { renderWithProviders } from '@/test/render'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('welcomes the visitor by app name', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('heading', { name: `Welcome to ${projectConfig.name}` })).toBeInTheDocument()
  })
})
