import * as vscode from 'vscode';
import { LoggingService } from './LoggingService';
import { TypeWrapper } from '../graphqlwrapper/TypeWrapper';
import { ScalarWrapper } from '../graphqlwrapper/ScalarWrapper';
import { EnumWrapper } from '../graphqlwrapper/EnumWrapper';
import { InputTypeWrapper } from '../graphqlwrapper/InputTypeWrapper';
import { RequestWrapper } from '../graphqlwrapper/RequestWrapper';
import { Request } from '../provider/RequestNodeProvider';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import { ServiceNode } from '../provider/ServiceNodeProvider';
import { InterfaceWrapper } from '../graphqlwrapper/InterfaceWrapper';
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

    removeRequest(customRequest: CustomRequest) {
        const idx = this.myRequests.indexOf(customRequest, 0);
        if (idx > -1) {
            this.myRequests.splice(idx, 1);
        }
    }

    removeService(service: ServiceNode) {
        const idx = this.services.indexOf(service, 0);
        if (idx > -1) {
            this.services.splice(idx, 1);
        }
    }

    saveService(service: ServiceNode) {
        this.services.push(service);
        vscode.commands.executeCommand('setContext', 'hasServices', true);
    }

    //#region getter and setter
    get context(): vscode.ExtensionContext | undefined {
        return this._context;
    }
    get logger(): LoggingService {
        return this._logger;
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

    get interfaces(): Array<InterfaceWrapper> {
        return this.get('interfaces') as Array<InterfaceWrapper>;
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

    get services(): Array<ServiceNode> {
        return this.get('services') as Array<ServiceNode>;
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
        this.update('interfaces', new Array<InterfaceWrapper>());
        this.update('inputtypes', new Array<InputTypeWrapper>());
        this.update('currentTree', new Array<Request>());
        this.update('requests', new Array<RequestWrapper>());
        this.update('myRequests', new Array<CustomRequest>());
        this.update('services', new Array<ServiceNode>());
    }
}
