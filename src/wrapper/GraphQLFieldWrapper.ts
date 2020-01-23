import { GraphQLWrapper } from './GraphQLWrapperInterface';

/**
 * Representation of an GraphQL Field
 */
export class FieldWrapper implements GraphQLWrapper {
    private _name: String;
    private _nonNull: boolean;
    private _isScalar: boolean;
    private _isList: boolean;
    private _ofType: String;
    private _description?: String;

    /**
     * Constructor of a graphql field
     * @param name Name of the field
     * @param nonNull is field requiered
     * @param isScalar is field a graphql scalar
     * @param isList is field a list
     * @param ofType the type of the field
     * @param description description of the field if the field has any
     */
    constructor(
        name: String,
        nonNull: boolean,
        isScalar: boolean,
        isList: boolean,
        ofType: String,
        description?: String
    ) {
        this._name = name;
        this._nonNull = nonNull;
        this._isScalar = isScalar;
        this._isList = isList;
        this._ofType = ofType;
        this._description = description;
    }

    /**
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): String {
        if (this._isScalar) {
            if (this._nonNull) {
                if (this._isList) {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}: Array<Scalars[${this.ofType}]>`
                        : `${this._name}: Array<Scalars[${this.ofType}]>`;
                } else {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}: Scalars[${this.ofType}]`
                        : `${this._name}: Scalars[${this.ofType}]`;
                }
            } else {
                if (this._isList) {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}?: Maybe<Array<Scalars[${this.ofType}]>>`
                        : `${this._name}?: Maybe<Array<Scalars[${this.ofType}]>>`;
                } else {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}?: Maybe<Scalars[${this.ofType}]>`
                        : `${this._name}?: Maybe<Scalars[${this.ofType}]>`;
                }
            }
        } else {
            if (this._nonNull) {
                if (this._isList) {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}: Array<${this.ofType}>`
                        : `${this._name}: Array<${this.ofType}>`;
                } else {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}: ${this.ofType}`
                        : `${this._name}: ${this.ofType}`;
                }
            } else {
                if (this._isList) {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}?: Maybe<Array<${this.ofType}>>`
                        : `${this._name}?: Maybe<Array<${this.ofType}>>`;
                } else {
                    return this._description !== null
                        ? `/**${this._description}*/
                        ${this._name}?: Maybe<${this.ofType}>`
                        : `${this._name}?: Maybe<${this.ofType}>`;
                }
            }
        }
    }

    /**
     * Basic toString method
     * @returns String representation of the object
     */
    toString(): String {
        return `FieldWrapper(name:${this._name}, description:${this._description}, nonNull:${this._nonNull}, isScalar:${this._isScalar}, ofType:${this.ofType})`;
    }

    //#region getter and setter
    get name(): String {
        return this._name;
    }

    get nonNull(): boolean {
        return this._nonNull;
    }

    get isScalar(): boolean {
        return this._isScalar;
    }

    get isList(): boolean {
        return this._isList;
    }

    get ofType(): String {
        return this._ofType;
    }

    get description(): String | undefined {
        return this._description;
    }
    //#endregion
}
