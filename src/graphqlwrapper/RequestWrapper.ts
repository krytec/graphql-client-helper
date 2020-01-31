import { FieldWrapper } from './FieldWrapper';
import { Request } from '../provider/RequestNodeProvider';

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

    get args(): Array<FieldWrapper> {
        return this._args;
    }

    set args(args: Array<FieldWrapper>) {
        this._args = args;
    }

    get isQuery(): boolean {
        return this._isQuery;
    }

    get isMutation(): boolean {
        return this._isMutation;
    }
    //#endregion
}
