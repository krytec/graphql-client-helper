import { Schema } from 'inspector';
import { type } from 'os';
import { dedent } from '../utils/Utils';
import { SchemaField } from './SchemaField';

/**
 * GraphQL Type class to represent a GraphQL Type
 */
export class SchemaType {
    private fields: Array<SchemaField>;
    public name!: String;
    private description?: String;
    private ofInterface?: String;

    /**
     * Constructor for a GraphQL Type, which can have fields
     * @param name Name of the type
     * @param description Description of the type
     */
    constructor(name: String, description?: String, ofInterface?: String) {
        this.name = name;
        this.description = description;
        this.ofInterface = ofInterface;
        this.fields = new Array<SchemaField>();
    }

    /**
     * Add a this to the type
     * key:String, value:String
     */
    public addField(value: SchemaField) {
        this.fields.push(value);
    }

    /**
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    public toTypescriptType(): String {
        let fieldsAsString: String = this.fields
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        //? TODO: Find a way to make this code look cleaner
        let typeAsString: String = `
/**${this.description}*/
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
    public toString(): String {
        return `SchemaType (name:${this.name}, description: ${this.description}, fields: ${this.fields})`;
    }
}
