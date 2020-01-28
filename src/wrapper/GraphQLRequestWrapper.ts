import { FieldWrapper } from './GraphQLFieldWrapper';

/**
 * Abstract RequestWrapper class for a graphql request (query, mutation, subscription)
 */
export abstract class RequestWrapper {
    private _args: Array<FieldWrapper>;
    constructor(
        private _name: string,
        private _type: string,
        private _returnsList: boolean,
        private _isQuery: boolean,
        private _isMutation: boolean,
        private _description?: string
    ) {
        this._args = new Array<FieldWrapper>();
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

    get Description(): string | undefined {
        return this._description;
    }

    get Args(): Array<FieldWrapper> {
        return this._args;
    }

    get isQuery(): boolean {
        return this._isQuery;
    }

    get isMutation(): boolean {
        return this._isMutation;
    }
    //#endregion
}
