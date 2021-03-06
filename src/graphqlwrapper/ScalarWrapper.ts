import { dedent } from '../utils/Utils';
import { GraphQLWrapper } from './GraphQLWrapperInterface';

/**
 * ScalarWrapper class to represent a GraphQL Scalar
 */
export class ScalarWrapper implements GraphQLWrapper {
    private _scalars: Array<ScalarFieldWrapper>;

    constructor() {
        this._scalars = new Array<ScalarFieldWrapper>();
    }

    /**
     * Method to add a ScalarFieldWrapper to the ScalarWrapper
     * @param field ScalarFieldWrapper which should be addet to the ScalarWrapper
     */
    addField(field: ScalarFieldWrapper) {
        this._scalars.push(field);
    }

    get fields(): Array<ScalarFieldWrapper> {
        return this._scalars;
    }

    /**
     * Basic to string method
     */
    toString(): string {
        return `ScalarWrapper{fields: ${this._scalars
            .map(scalar => scalar.toString())
            .join(', ')}}`;
    }

    /**
     * Method to create a Typescript type of the scalar as string
     */
    toTypescriptType(): string {
        let scalarType = `
export type Scalars = {
    ${this._scalars
        .map(x => `\n${x.toTypescriptType()},\n`)
        .map(x => x.replace(/\n/g, '\n    '))
        .join('')}
};
        `;
        return scalarType;
    }
}

/**
 * ScalarFieldWrapper class to represent Field in a ScalarWrapper
 */
export class ScalarFieldWrapper implements GraphQLWrapper {
    private _name: string;
    private _description?: string;
    private _type: string;

    /**
     * Constructor for a Scalar
     * @param name Name of the Scalar
     * @param type Type of the Scalar
     * @param description Description of the scalar
     */
    constructor(name: string, type: string, description?: string) {
        this._name = name;
        this._description = description;
        this._type = type;
    }

    /**
     * Basic toString() method to represent a Scalar as String
     */
    toString(): string {
        return `ScalarFieldWrapper(name:${this._name}, type:${this._type}, description:${this._description})`;
    }

    /**
     * Method to create a Typescript type as string
     */
    toTypescriptType(): string {
        switch (this._type) {
            case 'any':
                return this._description !== undefined
                    ? dedent`/**${this._description} */
                ${this.name}: any`
                    : dedent`${this._name}: any`;

            case 'string':
                return `${this._name}: string`;

            case 'number':
                return `${this._name}: number`;

            case 'boolean':
                return `${this._name}: boolean`;

            default:
                return '';
        }
    }

    get name() {
        return this._name;
    }
}
