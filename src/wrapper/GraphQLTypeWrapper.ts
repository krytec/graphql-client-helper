import { Schema } from 'inspector';
import { type } from 'os';
import { dedent } from '../utils/Utils';
import { FieldWrapper } from './GraphQLFieldWrapper';
import { GraphQLWrapper } from './GraphQLWrapperInterface';

/**
 * GraphQL Type class to represent a GraphQL Type
 */
export class TypeWrapper implements GraphQLWrapper {
    private _fields: Array<FieldWrapper>;

    /**
     * Constructor for a GraphQL Type, which can have fields
     * @param name Name of the type
     * @param description Description of the type
     */
    constructor(
        private _name: string,
        private _description?: string,
        private _ofInterface?: string
    ) {
        this._fields = new Array<FieldWrapper>();
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
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): string {
        let fieldsAsString: string = this._fields
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        //? FIXME: Find a way to make this code look cleaner
        let typeAsString: string = `
/**${this._description}*/
export type ${this.name} = {
    __typename?: '${this.name}',
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
