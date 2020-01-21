import { Schema } from 'inspector';
import { type } from 'os';

/**
 * !TODO: Implement method to typescript
 */
export class SchemaType {
    private fields: Array<SchemaField>;
    public name!: String;
    private description?: String;
    private ofInterface?: String;

    constructor(name: String, description?: String) {
        this.name = name;
        this.description = description;
        this.fields = new Array<SchemaField>();
    }

    /**
     * Add a field to the type
     * key:String, value:String
     */
    public addField(value: SchemaField) {
        this.fields.push(value);
    }

    public toTypescriptType(): String {
        let typeAsString: String = `
        /**${this.description}*/
        export type ${this.name} = {
            __typename?: '${this.name}',
        `;
        this.fields.forEach(field => {
            if (field.isScalar) {
                if (field.nonNull) {
                    if (field.isList) {
                        typeAsString += `${field.name}?: Array<Scalars[${field.ofType}]>,\n`;
                    } else {
                        typeAsString += `${field.name}?: Scalars[${field.ofType}],\n`;
                    }
                } else {
                    if (field.isList) {
                        typeAsString += `${field.name}: Array<Scalars[${field.ofType}]>,\n`;
                    } else {
                        typeAsString += `${field.name}: Scalars[${field.ofType}],\n`;
                    }
                }
            } else {
                if (field.nonNull) {
                    if (field.isList) {
                        typeAsString += `${field.name}?: Maybe<Array<${field.ofType}>>,\n`;
                    } else {
                        typeAsString += `${field.name}?: Maybe<${field.ofType}>,\n`;
                    }
                } else {
                    if (field.isList) {
                        typeAsString += `${field.name}: Array<${field.ofType}>,\n`;
                    } else {
                        typeAsString += `${field.name}:${field.ofType},\n`;
                    }
                }
            }
        });
        typeAsString += '};';
        return typeAsString;
    }

    public toString(): String {
        return `SchemaType (name:${this.name}, description: ${this.description}, fields: ${this.fields})`;
    }
}
/**
 * !TODO: Implement method to typescript
 */
export class SchemaField {
    public name: String;
    public nonNull: boolean;
    public isScalar: boolean;
    public isList: boolean;
    public ofType: String;
    public description?: String;

    constructor(
        name: String,
        nonNull: boolean,
        isScalar: boolean,
        isList: boolean,
        ofType: String,
        description?: String
    ) {
        this.name = name;
        this.nonNull = nonNull;
        this.isScalar = isScalar;
        this.isList = isList;
        this.ofType = ofType;
        this.description = description;
    }

    public toTypescriptType(): String {
        return '';
    }

    public toString(): String {
        return `SchemaField(name:${this.name}, description:${this.description}, nonNull:${this.nonNull}, isScalar:${this.isScalar}, ofType:${this.ofType})`;
    }
}
