/**
 * Representation of an GraphQL Field
 */
export class SchemaField {
    public name: String;
    public nonNull: boolean;
    public isScalar: boolean;
    public isList: boolean;
    public ofType: String;
    public description?: String;

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
        this.name = name;
        this.nonNull = nonNull;
        this.isScalar = isScalar;
        this.isList = isList;
        this.ofType = ofType;
        this.description = description;
    }

    /**
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    public toTypescriptType(): String {
        if (this.isScalar) {
            if (this.nonNull) {
                if (this.isList) {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}: Array<Scalars[${this.ofType}]>`
                        : `${this.name}: Array<Scalars[${this.ofType}]>`;
                } else {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}: Scalars[${this.ofType}]`
                        : `${this.name}: Scalars[${this.ofType}]`;
                }
            } else {
                if (this.isList) {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}?: Array<Scalars[${this.ofType}]>`
                        : `${this.name}?: Array<Scalars[${this.ofType}]>`;
                } else {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}?: Scalars[${this.ofType}]`
                        : `${this.name}?: Scalars[${this.ofType}]`;
                }
            }
        } else {
            if (this.nonNull) {
                if (this.isList) {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}: Maybe<Array<${this.ofType}>>`
                        : `${this.name}: Maybe<Array<${this.ofType}>>`;
                } else {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}: Maybe${this.ofType}>`
                        : `${this.name}: Maybe<${this.ofType}>`;
                }
            } else {
                if (this.isList) {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}?: Array<${this.ofType}>`
                        : `${this.name}?: Array<${this.ofType}>`;
                } else {
                    return this.description !== null
                        ? `/**${this.description}*/
                        ${this.name}?: ${this.ofType}`
                        : `${this.name}?:${this.ofType}`;
                }
            }
        }
    }

    /**
     * Basic toString method
     * @returns String representation of the object
     */
    public toString(): String {
        return `SchemaField(name:${this.name}, description:${this.description}, nonNull:${this.nonNull}, isScalar:${this.isScalar}, ofType:${this.ofType})`;
    }
}
