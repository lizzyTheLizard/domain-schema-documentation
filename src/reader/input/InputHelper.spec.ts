import { capitalize, getIdWithoutEnding, getName } from './InputHelper.ts'

describe('InputHelper', () => {
  test('getName from Module', async () => {
    const result = getName({ $id: '/Module/SubModule' })
    expect(result).toBe('SubModule')
  })

  test('getName from Schema', async () => {
    const result = getName({ $id: '/Module/SubModule/Schema.yaml' })
    expect(result).toBe('Schema')
  })

  test('getName from Id', async () => {
    const result = getName('/Module/SubModule/Schema.yaml')
    expect(result).toBe('Schema')
  })

  test('getName from relative Id', async () => {
    const result = getName('../Schema.yaml')
    expect(result).toBe('Schema')
  })

  test('getIdWithoutEnding from Module', async () => {
    const result = getIdWithoutEnding({ $id: '/Module/SubModule' })
    expect(result).toBe('/Module/SubModule')
  })

  test('getIdWithoutEnding from Schema', async () => {
    const result = getIdWithoutEnding({ $id: '/Module/SubModule/Schema.yaml' })
    expect(result).toBe('/Module/SubModule/Schema')
  })

  test('getIdWithoutEnding from Id', async () => {
    const result = getIdWithoutEnding('/Module/SubModule/Schema.yaml')
    expect(result).toBe('/Module/SubModule/Schema')
  })

  test('getIdWithoutEnding from relative Id', async () => {
    const result = getIdWithoutEnding('../Schema.yaml')
    expect(result).toBe('../Schema')
  })

  test('capitalize', async () => {
    const result = capitalize('sXX 72aA')
    expect(result).toBe('SXX 72aA')
  })
})
