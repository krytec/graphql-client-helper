import { dedent } from '../utils/Utils';

/**
 * Scalar class to represent a GraphQL Scalar
 */
export class SchemaScalar {
    private scalars: Array<ScalarField>;

    constructor() {
        this.scalars = new Array<ScalarField>();
    }

    /**
     * Method to add a ScalarField to the SchemaScalar
     * @param field ScalarField which should be addet to the SchemaScalar
     */
    public addField(field: ScalarField) {
        this.scalars.push(field);
    }
    /**
     * !TODO: Implementation
     */
    public toString() {}

    /**
     * Method to create a Typescript type of the scalar as string
     */
    public toTypescriptType(): String {
        let scalarType = `
export type Scalars = {
    ${this.scalars
        .map(x => `\n${x.toTypescriptType()},\n`)
        .map(x => x.replace(/\n/g, '\n    '))
        .join('')}
}
        `;
        return scalarType;
    }
}

/**
 * ScalarField class to represent Field in a SchemaScalar
 */
export class ScalarField {
    private name: String;
    private description?: String;
    private type: String;

    /**
     * Constructor for a Scalar
     * @param name Name of the Scalar
     * @param type Type of the Scalar
     * @param description Description of the scalar
     */
    constructor(name: String, type: String, description?: String) {
        this.name = name;
        this.description = description;
        this.type = type;
    }

    /**
     * Basic toString() method to represent a Scalar as String
     */
    public toString() {
        return `SchemaScalar(name:${this.name}, type:${this.type}, description:${this.description})`;
    }

    /**
     * Method to create a Typescript type as string
     */
    public toTypescriptType() {
        switch (this.type) {
            case 'any':
                return this.description !== undefined
                    ? dedent`/**${this.description} */
                ${this.name}: any`
                    : dedent`${this.name}: any`;

            case 'string':
                return `${this.name}: string`;

            case 'number':
                return `${this.name}: number`;

            case 'boolean':
                return `${this.name}: boolean`;
        }
    }
}
