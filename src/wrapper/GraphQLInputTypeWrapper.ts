import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { FieldWrapper } from './GraphQLFieldWrapper';
import { dedent } from '../utils/Utils';

export class InputTypeWrapper implements GraphQLWrapper {
    private _fields: Array<FieldWrapper>;

    /**
     * Constructor for an InputType
     * @param name name of the InputType
     * @param description description of the InputType
     */
    constructor(private _name: string, private _description?: string) {
        this._fields = new Array<FieldWrapper>();
    }

    /**
     * Adds a field of type FieldWrapper to the array
     * @param field field of an inputtype
     */
    addField(field: FieldWrapper) {
        this._fields.push(field);
    }

    /**
     * Returns an array of all fields by their names
     */
    getFieldNames() {
        return this._fields.map(field => field.name);
    }

    /**
     * ! TODO: Implementation
     */
    toString(): string {
        throw new Error('Method not implemented.');
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

    //#region getter and setter
    get name(): string {
        return this._name;
    }

    get field() {
        return this._fields;
    }
    //#endregion
}
