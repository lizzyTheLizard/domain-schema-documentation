/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  parse, BaseJavaCstVisitorWithDefaults,
  type FieldDeclarationCtx,
  type RecordComponentListCtx,
  type RecordComponentCtx,
  type UnannClassTypeCtx,
  type UnannPrimitiveTypeCtx,
  type PrimitiveTypeCtx,
  type ClassTypeCtx,
  type ImportDeclarationCtx,
  type PackageDeclarationCtx,
  type ClassDeclarationCtx,
  type InterfaceDeclarationCtx,
  type RecordDeclarationCtx,
  type NormalClassDeclarationCtx,
  type EnumDeclarationCtx,
  type EnumConstantCtx
} from 'java-parser'
import { type JavaType } from './JavaHelper'

/**
 * This will get the types from a java class source file.
 * It uses java-parser. While it seems to work fine, it uses a cst instead of an ast, which is a bit more complicated to work with.
 * To deal with this we need some black type magic (see end of file)
 * @param fileContent The content to parse
 * @returns The parsed properties or an error message
 */
export function parseClass (fileContent: string): Record<string, JavaType> | string {
  const cst = parse(fileContent)
  const visitor = new JavaParser()
  visitor.visit(cst)
  if (visitor.error !== undefined) return visitor.error
  if (visitor.type !== 'class' && visitor.type !== 'record') return `This is suppose to be a class or record but is a '${visitor.type}''`
  return visitor.properties
}

/**
 * This will check that this is a proper interface
 * It uses java-parser. While it seems to work fine, it uses a cst instead of an ast, which is a bit more complicated to work with.
 * To deal with this we need some black type magic (see end of file)
 * @param fileContent The content to parse
 * @returns undefined if it is a proper interface or an error message
 */
export function parseInterface (fileContent: string): undefined | string {
  const cst = parse(fileContent)
  const visitor = new JavaParser()
  visitor.visit(cst)
  if (visitor.error !== undefined) return visitor.error
  if (visitor.type !== 'interface') return `This is suppose to be an interface but is a '${visitor.type}''`
}

/**
 * This will get the enum values from a enum
 * It uses java-parser. While it seems to work fine, it uses a cst instead of an ast, which is a bit more complicated to work with.
 * To deal with this we need some black type magic (see end of file)
 * @param fileContent The content to parse
 * @returns The enum values or an error message
 */
export function parseEnum (fileContent: string): string[] | string {
  const cst = parse(fileContent)
  const visitor = new JavaParser()
  visitor.visit(cst)
  if (visitor.error !== undefined) return visitor.error
  if (visitor.type !== 'enum') return `This is suppose to be an enum but is a '${visitor.type}''`
  return visitor.enumValues
}

class JavaParser extends BaseJavaCstVisitorWithDefaults {
  public properties: Record<string, JavaType> = {}
  public name: string | undefined
  public type: 'class' | 'interface' | 'record' | 'enum' | undefined
  public imports: Record<string, string> = {}
  public error: string | undefined
  public enumValues: string[] = []
  public javaPackageName: string = ''

  constructor () {
    super()
    this.validateVisitor()
  }

  public override recordComponentList (listCtx: RecordComponentListCtx, param?: any): any {
    for (const nodes of listCtx.recordComponent) {
      const nodeCtx = nodes.children
      this.properties[this.getComponentName(nodeCtx)] = this.getType(nodeCtx)
    }
  }

  public override fieldDeclaration (ctx: FieldDeclarationCtx): any {
    if (this.isStaticField(ctx)) return
    const names = this.getFieldNames(ctx)
    const type = this.getType(ctx)
    names.forEach(name => { this.properties[name] = type })
  }

  public override importDeclaration (ctx: ImportDeclarationCtx, param?: any): any {
    if (ctx.Static !== undefined) {
      // Ignore static imports
      return
    }
    if (!ctx.packageOrTypeName) {
      // No package or type name, nothing to import
      return
    }
    const importName = getSubChild(ctx, 'packageOrTypeName').Identifier.map(i => i.image).join('.')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.imports[importName.split('.').pop()!] = importName
  }

  public override packageDeclaration (ctx: PackageDeclarationCtx, param?: any): any {
    this.javaPackageName = ctx.Identifier.map(i => i.image).join('.')
  }

  public override classDeclaration (ctx: ClassDeclarationCtx, param?: any): any {
    if (this.name !== undefined) {
      console.error('Nested Classes are not supported', ctx)
      this.error = 'Class contains nested classes. This is not supported by the validator'
      return
    }
    let declaration: NormalClassDeclarationCtx | RecordDeclarationCtx | EnumDeclarationCtx
    if (ctx.normalClassDeclaration) {
      this.type = 'class'
      declaration = getSubChild(ctx, 'normalClassDeclaration')
    } else if (ctx.recordDeclaration) {
      this.type = 'record'
      declaration = getSubChild(ctx, 'recordDeclaration')
    } else if (ctx.enumDeclaration) {
      this.type = 'enum'
      declaration = getSubChild(ctx, 'enumDeclaration')
    } else {
      console.error('Unknown class type', ctx)
      this.error = 'Cannot determine the type of the file. Not a class, record, interface or enum'
      return
    }
    const typeIdentifier = getSubChild(declaration, 'typeIdentifier')
    this.name = getSub(typeIdentifier, 'Identifier').image
    super.classDeclaration(ctx, param)
  }

  public override interfaceDeclaration (ctx: InterfaceDeclarationCtx, param?: any): any {
    if (this.name !== undefined) {
      console.error('Nested Classes are not supported', ctx)
      this.error = 'Class contains nested classes. This is not supported by the validator'
      return
    }
    this.type = 'interface'
    const normalInterfaceDeclaration = getSubChild(ctx, 'normalInterfaceDeclaration')
    const typeIdentifier = getSubChild(normalInterfaceDeclaration, 'typeIdentifier')
    this.name = getSub(typeIdentifier, 'Identifier').image
    super.interfaceDeclaration(ctx, param)
  }

  public override enumConstant (ctx: EnumConstantCtx, param?: any): any {
    this.enumValues.push(getSub(ctx, 'Identifier').image)
    super.enumConstant(ctx, param)
  }

  // Getting the name of the component is staighforward, we just take the identifier
  private getComponentName (ctx: RecordComponentCtx): string {
    return getSub(ctx, 'Identifier').image
  }

  private getFieldNames (ctx: FieldDeclarationCtx): string[] {
    const variableDeclaratorList = getSubChild(ctx, 'variableDeclaratorList')
    return variableDeclaratorList.variableDeclarator.map(v => {
      const variableDeclarator = v.children
      const variableDeclaratorId = getSubChild(variableDeclarator, 'variableDeclaratorId')
      return getSub(variableDeclaratorId, 'Identifier').image
    })
  }

  // A fiels is static if it has the static modifier
  private isStaticField (ctx: FieldDeclarationCtx): boolean {
    const modifiers = ctx.fieldModifier ?? []
    return modifiers.filter(m => m.children.Static).length > 0
  }

  // Here it is getting tricky... The type can be primitive or reference, additionally it can be an array or not.
  // Let's check those cases and redirect to the correct function getPrimitiveType or getReferenceType
  private getType (ctx: RecordComponentCtx | FieldDeclarationCtx): JavaType {
    const unannType = getSubChild(ctx, 'unannType')
    if (unannType.unannPrimitiveTypeWithOptionalDimsSuffix !== undefined) {
      const primitiveTypeWithDims = getSubChild(unannType, 'unannPrimitiveTypeWithOptionalDimsSuffix')
      const isArray = primitiveTypeWithDims.dims !== undefined
      const primitiveType = getSubChild(primitiveTypeWithDims, 'unannPrimitiveType')
      const itemType = this.getPrimitiveType(primitiveType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    if (unannType.unannReferenceType !== undefined) {
      const referenceType = getSubChild(unannType, 'unannReferenceType')
      const isArray = referenceType.dims !== undefined
      const classOrInterfaceType = getSubChild(referenceType, 'unannClassOrInterfaceType')
      const classType = getSubChild(classOrInterfaceType, 'unannClassType')
      const itemType = this.getReferenceType(classType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    console.error('Unknown Type: It is not a primitive nor a reference type', ctx)
    this.error = 'Cannot determine java type of property. Check logs for more information'
    return { type: 'CLASS', fullName: 'Object' }
  }

  // Primitive types are easy, we just need to check if it is a boolean or a numeric type and which kind
  private getPrimitiveType (ctx: UnannPrimitiveTypeCtx | PrimitiveTypeCtx): JavaType {
    if (ctx.Boolean !== undefined) return { type: 'CLASS', fullName: 'Boolean' }
    if (ctx.numericType !== undefined) {
      const numericType = getSubChild(ctx, 'numericType')
      if (numericType.floatingPointType !== undefined) {
        const floatingPointType = getSubChild(numericType, 'floatingPointType')
        if (floatingPointType.Float !== undefined) return { type: 'CLASS', fullName: 'Float' }
        if (floatingPointType.Double !== undefined) return { type: 'CLASS', fullName: 'Double' }
        console.error('Unknown floating point type: Not float nor double', ctx)
        this.error = 'Cannot determine java type of property. Check logs for more information'
        return { type: 'CLASS', fullName: 'Object' }
      }
      if (numericType.integralType !== undefined) {
        const integralType = getSubChild(numericType, 'integralType')
        if (integralType.Byte !== undefined) return { type: 'CLASS', fullName: 'Byte' }
        if (integralType.Short !== undefined) return { type: 'CLASS', fullName: 'Short' }
        if (integralType.Int !== undefined) return { type: 'CLASS', fullName: 'Integer' }
        if (integralType.Long !== undefined) return { type: 'CLASS', fullName: 'Long' }
        if (integralType.Char !== undefined) return { type: 'CLASS', fullName: 'Char' }
        console.error('Unknown integral type', ctx)
        this.error = 'Cannot determine java type of property. Check logs for more information'
        return { type: 'CLASS', fullName: 'Object' }
      }
      console.error('Unknown numeric type: Not floating point nor integral type', ctx)
      this.error = 'Cannot determine java type of property. Check logs for more information'
      return { type: 'CLASS', fullName: 'Object' }
    }
    console.error('Unknown primitive type: Not boolean nor numeric type', ctx)
    this.error = 'Cannot determine java type of property. Check logs for more information'
    return { type: 'CLASS', fullName: 'Object' }
  }

  // Reference types are harder... We need to check if its a collection type and if it is, we need to get the type of the items
  // Otherwise we need to get the full name of the class
  private getReferenceType (ctx: UnannClassTypeCtx | ClassTypeCtx): JavaType {
    const className = this.getFullClassName(ctx)
    if (this.isCollectionType(className)) {
      const typeArgument = this.getTypeArgumentFromCollection(ctx, 0)
      return { type: 'COLLECTION', items: typeArgument }
    }
    if (this.isMapType(className)) {
      const typeArgument = this.getTypeArgumentFromCollection(ctx, 1)
      return { type: 'MAP', items: typeArgument }
    }
    return { type: 'CLASS', fullName: className }
  }

  private getFullClassName (ctx: UnannClassTypeCtx | ClassTypeCtx): string {
    const classNameAsWritten = ctx.Identifier.map(i => i.image).join('.')
    // Check if this has already dots. Then it is a full class name
    if (classNameAsWritten.includes('.')) return classNameAsWritten
    // Check if the class is imported
    if (classNameAsWritten in this.imports) return this.imports[classNameAsWritten]
    // Check if this is 'String' or an boxed primitive type. Those need no imports
    if (['String', 'Integer', 'Boolean', 'Float', 'Double', 'Byte', 'Short', 'Long', 'Char', 'Object'].includes(classNameAsWritten)) return classNameAsWritten
    // Otherwise it is in the same package
    return this.javaPackageName + '.' + classNameAsWritten
  }

  private isCollectionType (fullName: string): boolean {
    return fullName === 'java.util.List' || fullName === 'java.util.Set' || fullName === 'java.util.Collection'
  }

  private isMapType (fullName: string): boolean {
    return fullName === 'java.util.Map'
  }

  private getTypeArgumentFromCollection (ctx: UnannClassTypeCtx | ClassTypeCtx, argumentNumber: number): JavaType {
    const typeArguments = getSubChild(ctx, 'typeArguments')
    const typeArgument = getSubChild(typeArguments, 'typeArgumentList')
    const type = getSubChild(typeArgument, 'typeArgument', argumentNumber)
    const referenceType = getSubChild(type, 'referenceType')
    const isArray = referenceType.dims !== undefined
    if (referenceType.primitiveType !== undefined) {
      const primitiveType = getSubChild(referenceType, 'primitiveType')
      const itemType = this.getPrimitiveType(primitiveType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    if (referenceType.classOrInterfaceType !== undefined) {
      const classOrInterfaceType = getSubChild(referenceType, 'classOrInterfaceType')
      const classType = getSubChild(classOrInterfaceType, 'classType')
      const itemType = this.getReferenceType(classType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    console.error('Generic type is not a primitive nor a reference type', ctx)
    this.error = 'Cannot determine java type of property. Check logs for more information'
    return { type: 'CLASS', fullName: 'Object' }
  }
}

function getSubChild<
    ContextType extends Partial<Record<IdentifierType, Array<{ children: ReturnType }>>>,
    IdentifierType extends keyof ContextType,
    ReturnType = NonNullable<ContextType[IdentifierType]>[0]['children']
  > (ctx: ContextType, identifier: IdentifierType, i?: number): ReturnType {
  const node = getSub(ctx, identifier, i)
  return node.children
}

function getSub<
    ContextType extends Partial<Record<IdentifierType, ReturnType[]>>,
    IdentifierType extends keyof ContextType,
    ReturnType = NonNullable<ContextType[IdentifierType]>[0]
  > (ctx: ContextType, identifier: IdentifierType, i?: number): ReturnType {
  const result = ctx[identifier]
  if (result === undefined) {
    console.error(`Context node does not have required attribute '${String(identifier)}'`, ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }
  if (i === undefined) {
    if (result.length !== 1) {
      console.error(`Required attribute '${String(identifier)}' is not unique`, ctx)
      throw new Error('Cannot determine java type. Check logs for more information.')
    }
    return result[0]
  } else {
    if (result.length < i + 1) {
      console.error(`Required attribute '${String(identifier)}[${i}]' is not defined`, ctx)
      throw new Error('Cannot determine java type. Check logs for more information.')
    }
    return result[i]
  }
}
