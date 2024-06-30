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
  type PackageDeclarationCtx
} from 'java-parser'
import { type JavaType } from './JavaHelper'
import { promises as fs } from 'fs'

/**
 * This will get the types from a java source file. It uses java-parser which seems to work fine but has some limitations.
 * java-parser uses a cst instead of an ast, which is a bit more complicated to work with.
 * To deal with this we need some black type magic (see end of file)
 */
export async function getPropertiesFromImplementation (filename: string): Promise<Record<string, JavaType>> {
  const fileContent = await fs.readFile(filename).then(b => b.toString())
  const cst = parse(fileContent)
  const visitor = new JavaParser()
  visitor.visit(cst)
  return visitor.results
}

class JavaParser extends BaseJavaCstVisitorWithDefaults {
  public results: Record<string, JavaType> = {}
  public imports: Record<string, string> = {}
  public javaPackageName: string = ''

  constructor () {
    super()
    this.validateVisitor()
  }

  public override recordComponentList (listCtx: RecordComponentListCtx, param?: any): any {
    for (const nodes of listCtx.recordComponent) {
      const nodeCtx = nodes.children
      this.results[this.getComponentName(nodeCtx)] = this.getType(nodeCtx)
    }
  }

  public override fieldDeclaration (ctx: FieldDeclarationCtx): any {
    if (this.isStaticField(ctx)) return
    const names = this.getFieldNames(ctx)
    const type = this.getType(ctx)
    names.forEach(name => { this.results[name] = type })
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
    const importName = getSingleChild(ctx, 'packageOrTypeName').Identifier.map(i => i.image).join('.')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.imports[importName.split('.').pop()!] = importName
  }

  public override packageDeclaration (ctx: PackageDeclarationCtx, param?: any): any {
    this.javaPackageName = ctx.Identifier.map(i => i.image).join('.')
  }

  // Getting the name of the component is staighforward, we just take the identifier
  private getComponentName (ctx: RecordComponentCtx): string {
    return getSingle(ctx, 'Identifier').image
  }

  private getFieldNames (ctx: FieldDeclarationCtx): string[] {
    const variableDeclaratorList = getSingleChild(ctx, 'variableDeclaratorList')
    return variableDeclaratorList.variableDeclarator.map(v => {
      const variableDeclarator = v.children
      const variableDeclaratorId = getSingleChild(variableDeclarator, 'variableDeclaratorId')
      return getSingle(variableDeclaratorId, 'Identifier').image
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
    const unannType = getSingleChild(ctx, 'unannType')
    if (unannType.unannPrimitiveTypeWithOptionalDimsSuffix !== undefined) {
      const primitiveTypeWithDims = getSingleChild(unannType, 'unannPrimitiveTypeWithOptionalDimsSuffix')
      const isArray = primitiveTypeWithDims.dims !== undefined
      const primitiveType = getSingleChild(primitiveTypeWithDims, 'unannPrimitiveType')
      const itemType = this.getPrimitiveType(primitiveType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    if (unannType.unannReferenceType !== undefined) {
      const referenceType = getSingleChild(unannType, 'unannReferenceType')
      const isArray = referenceType.dims !== undefined
      const classOrInterfaceType = getSingleChild(referenceType, 'unannClassOrInterfaceType')
      const classType = getSingleChild(classOrInterfaceType, 'unannClassType')
      const itemType = this.getReferenceType(classType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    console.error('Unknown Type: It is not a primitive nor a reference type', ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }

  // Primitive types are easy, we just need to check if it is a boolean or a numeric type and which kind
  private getPrimitiveType (ctx: UnannPrimitiveTypeCtx | PrimitiveTypeCtx): JavaType {
    if (ctx.Boolean !== undefined) return { type: 'CLASS', fullName: 'Boolean' }
    if (ctx.numericType !== undefined) {
      const numericType = getSingleChild(ctx, 'numericType')
      if (numericType.floatingPointType !== undefined) {
        const floatingPointType = getSingleChild(numericType, 'floatingPointType')
        if (floatingPointType.Float !== undefined) return { type: 'CLASS', fullName: 'Float' }
        if (floatingPointType.Double !== undefined) return { type: 'CLASS', fullName: 'Double' }
        console.error('Unknown floating point type: Not float nor double', ctx)
        throw new Error('Cannot determine java type. Check logs for more information.')
      }
      if (numericType.integralType !== undefined) {
        const integralType = getSingleChild(numericType, 'integralType')
        if (integralType.Byte !== undefined) return { type: 'CLASS', fullName: 'Byte' }
        if (integralType.Short !== undefined) return { type: 'CLASS', fullName: 'Short' }
        if (integralType.Int !== undefined) return { type: 'CLASS', fullName: 'Integer' }
        if (integralType.Long !== undefined) return { type: 'CLASS', fullName: 'Long' }
        if (integralType.Char !== undefined) return { type: 'CLASS', fullName: 'Char' }
        console.error('Unknown integral type', ctx)
        throw new Error('Cannot determine java type. Check logs for more information.')
      }
      console.error('Unknown numeric type: Not floating point nor integral type', ctx)
      throw new Error('Cannot determine java type. Check logs for more information.')
    }
    console.error('Unknown primitive type: Not boolean nor numeric type', ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }

  // Reference types are harder... We need to check if its a collection type and if it is, we need to get the type of the items
  // Otherwise we need to get the full name of the class
  private getReferenceType (ctx: UnannClassTypeCtx | ClassTypeCtx): JavaType {
    const className = this.getFullClassName(ctx)
    if (!this.isCollectionType(className)) {
      return { type: 'CLASS', fullName: className }
    }
    const typeArgument = this.getTypeArgumentFromCollection(ctx)
    return { type: 'COLLECTION', items: typeArgument }
  }

  private getFullClassName (ctx: UnannClassTypeCtx | ClassTypeCtx): string {
    const classNameAsWritten = ctx.Identifier.map(i => i.image).join('.')
    // Check if this has already dots. Then it is a full class name
    if (classNameAsWritten.includes('.')) return classNameAsWritten
    // Check if the class is imported
    if (classNameAsWritten in this.imports) return this.imports[classNameAsWritten]
    // Check if this is 'String' or an boxed primitive type. Those need no imports
    if (['String', 'Integer', 'Boolean', 'Float', 'Double', 'Byte', 'Short', 'Long', 'Char'].includes(classNameAsWritten)) return classNameAsWritten
    // Otherwise it is in the same package
    return this.javaPackageName + '.' + classNameAsWritten
  }

  private isCollectionType (fullName: string): boolean {
    return fullName === 'java.util.List' || fullName === 'java.util.Set' || fullName === 'java.util.Collection'
  }

  private getTypeArgumentFromCollection (ctx: UnannClassTypeCtx | ClassTypeCtx): JavaType {
    const typeArguments = getSingleChild(ctx, 'typeArguments')
    const typeArgument = getSingleChild(typeArguments, 'typeArgumentList')
    const type = getSingleChild(typeArgument, 'typeArgument')
    const referenceType = getSingleChild(type, 'referenceType')
    const isArray = referenceType.dims !== undefined
    if (referenceType.primitiveType !== undefined) {
      const primitiveType = getSingleChild(referenceType, 'primitiveType')
      const itemType = this.getPrimitiveType(primitiveType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    if (referenceType.classOrInterfaceType !== undefined) {
      const classOrInterfaceType = getSingleChild(referenceType, 'classOrInterfaceType')
      const classType = getSingleChild(classOrInterfaceType, 'classType')
      const itemType = this.getReferenceType(classType)
      return isArray ? { type: 'COLLECTION', items: itemType } : itemType
    }
    console.error('Generic type is not a primitive nor a reference type', ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }
}

function getSingleChild<
    ContextType extends Partial<Record<IdentifierType, Array<{ children: ReturnType }>>>,
    IdentifierType extends keyof ContextType,
    ReturnType = NonNullable<ContextType[IdentifierType]>[0]['children']
  > (ctx: ContextType, identifier: IdentifierType): ReturnType {
  const node = getSingle(ctx, identifier)
  return node.children
}

function getSingle<
    ContextType extends Partial<Record<IdentifierType, ReturnType[]>>,
    IdentifierType extends keyof ContextType,
    ReturnType = NonNullable<ContextType[IdentifierType]>[0]
  > (ctx: ContextType, identifier: IdentifierType): ReturnType {
  const result = ctx[identifier]
  if (result === undefined) {
    console.error(`Context node does not have required attribute '${String(identifier)}'`, ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }
  if (result.length !== 1) {
    console.error(`Required attribute '${String(identifier)}' is not unique`, ctx)
    throw new Error('Cannot determine java type. Check logs for more information.')
  }
  return result[0]
}
