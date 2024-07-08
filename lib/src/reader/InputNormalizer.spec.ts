import { type Schema } from 'ajv'
import { InputNormalizer } from './InputNormalizer'

describe('InputNormalizer', () => {
  const applicationFile = { title: 'Title', description: 'Description' }
  const moduleFile = { $id: '/Module', title: 'Module', description: 'Description' }
  const objectSchemaFile = {
    $id: '/Module/Schema.yaml',
    title: 'Schema',
    'x-schema-type': 'Aggregate',
    type: 'object',
    properties: { key: { type: 'number' } }
  }
  const enumSchemaFile = {
    $id: '/Module/Enum.yaml',
    title: 'Enum',
    'x-schema-type': 'Aggregate',
    type: 'string',
    enum: ['A']
  }
  const interfaceSchemaFile = {
    $id: '/Module/Interface.yaml',
    title: 'Inter Face',
    'x-schema-type': 'Aggregate',
    type: 'object',
    oneOf: [{ $ref: './Schema.yaml' }]
  }
  const schema: Schema = { ...objectSchemaFile, definitions: {}, required: [], 'x-links': [], 'x-errors': [], 'x-todos': [] }
  let target: InputNormalizer

  beforeEach(() => {
    target = new InputNormalizer({
      noAdditionalPropertiesInExamples: true,
      ajvOptions: {},
      allowedFormats: [],
      allowedKeywords: []
    })
  })

  test('applicationFile', async () => {
    expect(() => {
      target.toModel()
    }).toThrow(new Error('No application file found'))
    expect(() => {
      target.addApplication(applicationFile, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.toModel()
    }).not.toThrow()
    expect(() => {
      target.addApplication({ wrong: 'field' }, 'file.yaml')
    }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('moduleFile', async () => {
    expect(() => {
      target.addModule(moduleFile, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addModule({ wrong: 'field' }, 'file.yaml')
    }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('schemaFile', async () => {
    expect(() => {
      target.addSchema(objectSchemaFile, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({ wrong: 'field' }, 'file.yaml')
    }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('toModel', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    expect(target.toModel()).toEqual({
      schemas: [schema],
      application: { ...applicationFile, errors: [], todos: [], links: [] },
      modules: [{ ...moduleFile, errors: [], todos: [], links: [] }]
    })
  })

  test('validateId', async () => {
    expect(() => {
      target.addModule(moduleFile, 'file.yaml', '/Module')
    }).not.toThrow()
    expect(() => {
      target.addModule(moduleFile, 'file.yaml', '/Module2')
    }).toThrow(new Error("Invalid $id in file file.yaml. It must be the same as the file path '/Module2' but is '/Module'"))
    expect(() => {
      target.addSchema(objectSchemaFile, 'file.yaml', '/Module/Schema.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema(objectSchemaFile, 'file.yaml', '/Module2/Schema.yaml')
    }).toThrow(new Error("Invalid $id in file file.yaml. It must be the same as the file path '/Module2/Schema.yaml' but is '/Module/Schema.yaml'"))
  })

  test('validateEnumDocumentation', () => {
    expect(() => {
      target.addSchema({ ...enumSchemaFile, 'x-enum-description': {} }, 'file.yaml')
    }).toThrow(new Error('File file.yaml has an \'x-enum-description\' but is missing documentation for enum value \'A\''))
    expect(() => {
      target.addSchema({
        ...enumSchemaFile,
        'x-enum-description': { A: 'test', B: 'test' }
      }, 'file.yaml')
    }).toThrow(new Error('File file.yaml has an \'x-enum-description\' for enum value \'B\' that does not exist'))
    expect(() => {
      target.addSchema({ ...enumSchemaFile, 'x-enum-description': { A: 'test' } }, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({ ...enumSchemaFile, $id: '/Module/Enum2.yaml' }, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({ ...objectSchemaFile, 'x-enum-description': { A: 'test' } }, 'file.yaml')
    }).not.toThrow()
  })

  test('validateRequired', () => {
    expect(() => {
      target.addSchema({ ...objectSchemaFile, $id: '/Module/Schema1.yaml', required: ['key'] }, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({ ...objectSchemaFile, $id: '/Module/Schema2.yaml', required: [] }, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({ ...objectSchemaFile, $id: '/Module/Schema3.yaml' }, 'file.yaml')
    }).not.toThrow()
    expect(() => {
      target.addSchema({
        ...objectSchemaFile,
        $id: '/Module/Schema4.yaml',
        required: ['other']
      }, 'file.yaml')
    }).toThrow(new Error('File file.yaml has a required property \'other\' that is not defined'))
  })

  test('verifyExamples no examples', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    expect(() => { target.toModel() }).not.toThrow()
  })

  test('verifyExamples empty examples', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [] }, 'file.yaml')
    expect(() => { target.toModel() }).not.toThrow()
  })

  test('verifyExamples invalid examples', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [{ key: 7 }, { key: 'wrong' }] }, 'file.yaml')
    expect(() => { target.toModel() })
      .toThrow(new Error('Invalid example [1] in Schema /Module/Schema.yaml. See logs for details'))
  })

  test('verifyExamples additional properties', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [{ key: 7 }, { key: 8, wrong: '2' }] }, 'file.yaml')
    expect(() => { target.toModel() })
      .toThrow(new Error('Invalid example [1] in Schema /Module/Schema.yaml. See logs for details'))
  })

  test('verifyExamples additional properties allowed', () => {
    target = new InputNormalizer({
      noAdditionalPropertiesInExamples: false,
      ajvOptions: {},
      allowedFormats: [],
      allowedKeywords: []
    })
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [{ key: 7 }, { key: 8, wrong: '2' }] }, 'file.yaml')
    expect(() => { target.toModel() }).not.toThrow()
  })

  test('verifyExamples valid examples', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [{ key: 7 }] }, 'file.yaml')
    target.addSchema({ ...enumSchemaFile, examples: ['A'] }, 'file.yaml')
    target.addSchema({
      ...objectSchemaFile,
      $id: '/Module/Schema2.yaml',
      properties: { ref: { $ref: './Schema.yaml' } },
      examples: [{ ref: { key: 7 } }]
    }, 'file.yaml')
    expect(() => { target.toModel() }).not.toThrow()
  })

  test('verifyReferences valid', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, examples: [{ key: 7 }] }, 'file.yaml')
    target.addSchema({
      ...objectSchemaFile,
      $id: '/Module/Schema2.yaml',
      properties: { ref: { $ref: './Schema.yaml' } }
    }, 'file.yaml')
    target.addSchema({
      ...objectSchemaFile,
      $id: '/Module2/Schema2.yaml',
      properties: { ref: { $ref: '../Module/Schema.yaml' } }
    }, 'file.yaml')
    expect(() => {
      target.toModel()
    }).not.toThrow()
  })

  test('verifyReferences invalid', () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({
      ...objectSchemaFile,
      $id: '/Module/Schema2.yaml',
      properties: { ref: { $ref: './Schema.yaml' } },
      examples: [{ ref: { key: 7 } }]
    }, 'file.yaml')
    expect(() => {
      target.toModel()
    }).toThrow(new Error('Invalid Reference \'./Schema.yaml\' in Schema /Module/Schema2.yaml'))
  })

  test('normalizeOneOf', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    target.addSchema(interfaceSchemaFile, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === interfaceSchemaFile.$id)).toEqual({
      ...interfaceSchemaFile,
      definitions: {},
      oneOf: [{ $ref: './Schema.yaml' }],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeOneOf dependencies', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    target.addSchema({ ...interfaceSchemaFile, oneOf: [{ type: 'object', properties: objectSchemaFile.properties }] }, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === interfaceSchemaFile.$id)).toEqual({
      ...interfaceSchemaFile,
      definitions: { InterFace1: { type: 'object', properties: objectSchemaFile.properties, required: [] } },
      oneOf: [{ $ref: '#/definitions/InterFace1' }],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeProperties', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === objectSchemaFile.$id)).toEqual({
      ...objectSchemaFile,
      definitions: {},
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeProperties with dependencies', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, properties: { deep: { type: 'object', properties: objectSchemaFile.properties } } }, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === objectSchemaFile.$id)).toEqual({
      ...objectSchemaFile,
      definitions: { Deep: { type: 'object', properties: objectSchemaFile.properties, required: [] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeProperties with enum dependencies', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, properties: { deep: { type: 'string', enum: enumSchemaFile.enum } } }, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === objectSchemaFile.$id)).toEqual({
      ...objectSchemaFile,
      definitions: { Deep: { type: 'string', enum: enumSchemaFile.enum } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeProperties with oneOf dependencies', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema({ ...objectSchemaFile, properties: { deep: { type: 'object', oneOf: interfaceSchemaFile.oneOf } } }, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === objectSchemaFile.$id)).toEqual({
      ...objectSchemaFile,
      definitions: { Deep: { type: 'object', oneOf: interfaceSchemaFile.oneOf } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })

  test('normalizeEnum', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(objectSchemaFile, 'file.yaml')
    target.addSchema(enumSchemaFile, 'file.yaml')
    expect(target.toModel().schemas.find(s => s.$id === enumSchemaFile.$id)).toEqual({
      ...enumSchemaFile,
      definitions: {},
      'x-links': [],
      'x-errors': [],
      'x-todos': []
    })
  })
})
