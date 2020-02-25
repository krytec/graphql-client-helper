import { Schema } from 'inspector';
import { type } from 'os';
import { dedent } from '../utils/Utils';
import { FieldWrapper } from './FieldWrapper';
import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { InterfaceWrapper } from './InterfaceWrapper';

/**
 * GraphQL Type class to represent a GraphQL Type
 */
export class TypeWrapper implements GraphQLWrapper {
    private _fields: Array<FieldWrapper>;
    private _interfaces?: Array<InterfaceWrapper>;
    /**
     * Constructor for a GraphQL Type, which can have fields
     * @param name Name of the type
     * @param description Description of the type
     */
    constructor(private _name: string, private _description?: string) {
        this._fields = new Array<FieldWrapper>();
    }

    addInterface(value: InterfaceWrapper) {
        if (!this._interfaces) {
            this._interfaces = new Array<InterfaceWrapper>();
        }
        this._interfaces.push(value);
    }
    /**
     * Add a this to the type
     * key:String, value:String
     */
    addField(value: FieldWrapper) {
        this._fields.push(value);
    }

    /**
     * Returns every field with the given name
     * @param name name of the field
     */
    getField(name: string) {
        return this._fields.filter(field => field.name === name);
    }

    /**
     * Returns all fields
     */
    getFields() {
        return this._fields;
    }

    /**
     * Method to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): string {
        let interfacesAsString: string = '';
        let fieldsAsString: string = this._fields
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        if (this._interfaces) {
            interfacesAsString = this._interfaces
                .map(i => `${i.name} & `)
                .join('');
        }
        //? FIXME: Find a way to make this code look cleaner
        let typeAsString: string = `
${this._description !== undefined ? `/**${this._description}*/` : ``}
export type ${this._name} = ${interfacesAsString} {
    __typename?: '${this._name}',
    ${fieldsAsString}
};
        `;

        return typeAsString;
    }

    /**
     * Basic toString method
     * @returns String representation of the object
     */
    toString(): string {
        return `SchemaType (name:${this.name}, description: ${this._description}, fields: ${this._fields})`;
    }

    get name() {
        return this._name;
    }
}
