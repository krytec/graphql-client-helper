import * as vscode from 'vscode';
import { LoggingService } from './LoggingService';
import { TypeWrapper } from '../graphqlwrapper/TypeWrapper';
import { ScalarWrapper } from '../graphqlwrapper/ScalarWrapper';
import { EnumWrapper } from '../graphqlwrapper/EnumWrapper';
import { InputTypeWrapper } from '../graphqlwrapper/InputTypeWrapper';
import { RequestWrapper } from '../graphqlwrapper/RequestWrapper';
import { Request } from '../provider/RequestNodeProvider';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { GraphQLSchema } from 'graphql';
/**
 * Service for a global extension state,
 * implements the vscode.Memento interface
 */
export class StateService implements vscode.Memento {
    private _state: Map<string, any> = new Map<string, any>();

    constructor(
        private _logger: LoggingService,
        private _context?: vscode.ExtensionContext
    ) {
        this.initState();
    }

    get<T>(key: string): T {
        return this._state.get(key);
    }

    update(key: string, value: any): Thenable<void> {
        this._state.set(key, value);
        return new Promise<void>((resolve, reject) => {
            if (this._state.get(key) !== undefined) {
                resolve(value);
            } else {
                reject(key);
            }
        });
    }

    clearState() {
        this.initState();
        this._logger.logDebug('State has been resetted');
    }

    saveRequest(customRequest: CustomRequest) {
        this.myRequests.push(customRequest);
        vscode.commands.executeCommand('setContext', 'hasRequests', true);
    }

    //#region getter and setter
    get context(): vscode.ExtensionContext | undefined {
        return this._context;
    }
    get logger(): LoggingService {
        return this._logger;
    }

    get schema(): GraphQLSchema {
        return this.get('schema') as GraphQLSchema;
    }

    get scalar(): ScalarWrapper {
        return this.get('scalar') as ScalarWrapper;
    }

    get types(): Array<TypeWrapper> {
        return this.get('types') as Array<TypeWrapper>;
    }

    get enums(): Array<EnumWrapper> {
        return this.get('enums') as Array<EnumWrapper>;
    }

    get inputTypes(): Array<InputTypeWrapper> {
        return this.get('inputtypes') as Array<InputTypeWrapper>;
    }

    get requests(): Array<RequestWrapper> {
        return this.get('requests') as Array<RequestWrapper>;
    }

    get currentTree(): Array<Request> {
        return this.get('currentTree') as Array<Request>;
    }

    set currentTree(tree: Array<Request>) {
        this.update('currentTree', tree);
    }

    get myRequests(): Array<CustomRequest> {
        return this.get('myRequests') as Array<CustomRequest>;
    }

    //#endregion

    /**
     * Method to initialize the state of the extension
     */
    private initState() {
        vscode.commands.executeCommand('setContext', 'hasRequests', false);
        vscode.commands.executeCommand('setContext', 'schemaLoaded', false);
        this.update('context', this._context).then(undefined, x => {
            this._logger.logDebug('No context set!');
        });
        this.update('logger', this._logger);
        this.update('types', new Array<TypeWrapper>());
        this.update('scalar', new ScalarWrapper());
        this.update('enums', new Array<EnumWrapper>());
        this.update('inputtypes', new Array<InputTypeWrapper>());
        this.update('currentTree', new Array<Request>());
        this.update('requests', new Array<RequestWrapper>());
        this.update('myRequests', new Array<CustomRequest>());
    }
}
