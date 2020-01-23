import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { dedent } from '../utils/Utils';

/**
 * Wrapper class for a GraphQLEnumType
 */
export class EnumWrapper implements GraphQLWrapper {
    private _name: String;
    private _values: Array<any>;
    private _description?: String;

    /**
     * Constructor for a enum wrapper
     * @param _name the _name of the enum
     * @param _values the _values of the enum
     * @param _description _description of the enum
     */
    constructor(_name: String, _values: Array<any>, _description?: String) {
        this._name = _name;
        this._values = _values;
        this._description = _description;
    }

    /**
     * Method to represent a EnumWrapper as a String
     */
    toString(): String {
        return `EnumWrapper(_name:${this._name}, 
            _values:[${this._values.map(x => `${x._name}`).join(',')}]
            ${
                this._description ? `, _description:${this._description}` : ``
            } )`.replace(/\n\s\s+/gm, '');
    }

    /**
     * Method to represent a EnumWrapper as a typescript enum
     */
    toTypescriptType(): String {
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
    get name(): String {
        return this._name;
    }

    get description(): String | undefined {
        return this._description;
    }

    get values(): Array<any> {
        return this._values;
    }
    //#endregion
}
