import * as vscode from 'vscode';
import { LoggingService } from './LoggingService';
import { TypeWrapper } from '../wrapper/GraphQLTypeWrapper';
import { ScalarWrapper } from '../wrapper/GraphQLScalarWrapper';
import { EnumWrapper } from '../wrapper/GraphQLEnumWrapper';
import { InputTypeWrapper } from '../wrapper/GraphQLInputTypeWrapper';
import { QueryWrapper } from '../wrapper/GraphQLQueryWrapper';
import { MutationWrapper } from '../wrapper/GraphQLMutationWrapper';
import { RequestWrapper } from '../wrapper/GraphQLRequestWrapper';
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

    get inputTypes(): Array<InputTypeWrapper> {
        return this.get('inputtypes') as Array<InputTypeWrapper>;
    }

    get requests(): Array<RequestWrapper> {
        return this.get('requests') as Array<RequestWrapper>;
    }

    get queries(): Array<QueryWrapper> {
        return this.get('queries') as Array<QueryWrapper>;
    }

    get mutations(): Array<MutationWrapper> {
        return this.get('mutation') as Array<MutationWrapper>;
    }
    //#endregion

    private initState() {
        this.update('context', this._context).then(undefined, x => {
            this._logger.logDebug('No context set!');
        });
        this.update('logger', this._logger);
        this.update('types', new Array<TypeWrapper>());
        this.update('scalar', new ScalarWrapper());
        this.update('enums', new Array<EnumWrapper>());
        this.update('inputtypes', new Array<InputTypeWrapper>());
        this.update('queries', new Array<QueryWrapper>());
        this.update('mutations', new Array<MutationWrapper>());
        this.update('requests', new Array<RequestWrapper>());
    }
}
