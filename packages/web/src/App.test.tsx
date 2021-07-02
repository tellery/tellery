import * as React from 'react'
import { render } from '@testing-library/react'
import { expect } from 'chai'
import App from './App'
import { describe, it } from 'mocha'

describe('<App>', () => {
  it('renders learn react link', () => {
    const { getByText } = render(<App />)
    const linkElement = getByText(/learn react/i)
    console.log(linkElement)
    expect(true)
  })
})
