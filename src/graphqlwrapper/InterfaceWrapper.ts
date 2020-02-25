import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { FieldWrapper } from './FieldWrapper';
import { dedent } from '../utils/Utils';

/**
 * InterfaceWrapper class to represent a GraphQL Interface
 */
export class InterfaceWrapper implements GraphQLWrapper {
    private _fields: Array<FieldWrapper>;

    /**
     * Default constructor
     * @param _name name of the interface
     * @param _description description of the interface
     */
    constructor(private _name: string, private _description?: string) {
        this._fields = new Array<FieldWrapper>();
    }

    //#region getter&setter
    get fields(): Array<FieldWrapper> {
        return this._fields;
    }

    get name() {
        return this._name;
    }

    get description(): string {
        return this._description !== undefined ? this._description : '';
    }
    //#endregion

    /**
     * Adds a field to the interface
     * @param field field that should be addet
     */
    addField(field: FieldWrapper) {
        this._fields.push(field);
    }

    /**
     * Basic toString method to represent an interfacewrapper as string
     */
    toString(): string {
        throw new Error('Method not implemented.');
    }

    /**
     * Method to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): string {
        let fieldsAsString: string = this._fields
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        //? FIXME: Find a way to make this code look cleaner
        let typeAsString: string = `
${this._description !== undefined ? `/**${this._description}*/` : ``}
export interface ${this._name} {
    ${fieldsAsString}
};
        `;

        return typeAsString;
    }
}
