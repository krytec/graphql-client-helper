export abstract class RequestWrapper {
    constructor(private _isQuery: boolean, private _isMutation: boolean) {}
    get isQuery(): boolean {
        return this._isQuery;
    }
    get isMutation(): boolean {
        return this._isMutation;
    }
}
