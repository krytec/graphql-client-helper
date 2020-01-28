import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { TypeWrapper } from './GraphQLTypeWrapper';
import { FieldWrapper } from './GraphQLFieldWrapper';
import { RequestWrapper } from './GraphQLRequestWrapper';
import { dedent } from '../utils/Utils';

/**
 * Wrapper class for a GraphQLQueryType
 */
export class QueryWrapper extends RequestWrapper implements GraphQLWrapper {
    private _args: Array<FieldWrapper>;
    constructor(
        private _name: string,
        private _description,
        private _type: string,
        private _returnsList: boolean
    ) {
        super(true, false);
        this._args = new Array<FieldWrapper>();
    }

    toString(): string {
        return '';
    }

    /**
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): string {
        let fieldsAsString: string = this._args
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        //? FIXME: Find a way to make this code look cleaner
        let typeAsString: string = `
/**${this._description}*/
query ${this._name}Query{
    ${fieldsAsString}
};
        `;

        return typeAsString;
    }

    /**
     * Adds an argument to the query
     * @param argument Argument as FieldWrapper
     */
    addArgument(argument: FieldWrapper) {
        this._args.push(argument);
    }

    //#region getter & setter
    get Name(): string {
        return this._name;
    }

    get Type(): string {
        return this._type;
    }
    //#endregion
}
