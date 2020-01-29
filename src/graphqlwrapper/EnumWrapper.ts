import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { dedent } from '../utils/Utils';

/**
 * Wrapper class for a GraphQLEnumType
 */
export class EnumWrapper implements GraphQLWrapper {
    /**
     * Constructor for a enum wrapper
     * @param _name the _name of the enum
     * @param _values the _values of the enum
     * @param _description _description of the enum
     */
    constructor(
        private _name: string,
        private _values: Array<any>,
        private _description?: string
    ) {}

    /**
     * Method to represent a EnumWrapper as a String
     */
    toString(): string {
        return `EnumWrapper(_name:${this._name}, 
            _values:[${this._values.map(x => `${x._name}`).join(',')}]
            ${
                this._description ? `, _description:${this._description}` : ``
            } )`.replace(/\n\s\s+/gm, '');
    }

    /**
     * Method to represent a EnumWrapper as a typescript enum
     */
    toTypescriptType(): string {
        let enumvalues: String = this._values
            .map(x => dedent`\t${x._name},\n`)
            .join('');
        return `
export enum ${this._name} {
    ${enumvalues}
}
        `.replace(/^\s*[\r\n]/gm, '');
    }

    //#region getter and setter
    get name(): string {
        return this._name;
    }

    get description(): string | undefined {
        return this._description;
    }

    get values(): Array<any> {
        return this._values;
    }
    //#endregion
}
