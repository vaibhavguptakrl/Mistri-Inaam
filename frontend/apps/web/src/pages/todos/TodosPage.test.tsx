import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { TodosPage } from './TodosPage'

describe('TodosPage', () => {
  it('loads the list and adds a todo', async () => {
    renderWithProviders(<TodosPage />)
    expect(await screen.findByText('Run npm run setup')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('New todo'), 'Buy milk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
  })
})
