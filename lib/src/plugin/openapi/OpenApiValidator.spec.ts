import { fullSpec } from './testData'
import { OpenApiValidator } from './OpenApiValidator'

describe('OpenApiValidator', () => {
  let target: OpenApiValidator

  beforeEach(() => {
    target = new OpenApiValidator()
  })
  test('reject invalid', async () => {
    expect(() => { target.validate('test', { ...fullSpec(), wrong: 'value' }) }).toThrow()
    expect(() => { target.validate('test', fullSpec()) }).not.toThrow()
  })
})
