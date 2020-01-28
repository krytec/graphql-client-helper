import * as vscode from 'vscode';
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import GraphQLService from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';
import { StateService } from './StateService';
import { generatedFolder } from '../constants';
const path = require('path');
/**
 * Service class to create vscode commands and register them to vscode
 */
export class CommandService {
    private _logger: LoggingService;
    private _ctx: vscode.ExtensionContext;

    /**
     * Constructor
     * @param _stateService The stateService of the extension
     * @param _graphQLService GraphQLService
     */
    constructor(
        private _stateService: StateService,
        private _graphQLService: GraphQLService
    ) {
        this._logger = _stateService.logger;
        this._ctx = this._stateService.context as vscode.ExtensionContext;
        this.workspaceFolderChanged();
        vscode.workspace.onDidChangeWorkspaceFolders(
            () => this.workspaceFolderChanged
        );
    }

    private workspaceFolderChanged() {
        if (vscode.workspace.workspaceFolders !== undefined) {
            const schemaFile = path.join(
                vscode.workspace.workspaceFolders[0].uri.fsPath,
                generatedFolder + '/schema.gql'
            );
            this._graphQLService
                .getSchemaFromFile(schemaFile)
                .then(schema => {
                    this._graphQLService.createTypesFromSchema(schema);
                    this._graphQLService.getRequestsFromSchema(schema);
                })
                .catch(err => vscode.window.showErrorMessage(err));
        }
    }
    /**
     * registers all commands to vscode
     */
    registerCommands() {
        const showLogCommand = vscode.commands.registerCommand(
            'extension.showLog',
            () => {
                showLogingWindowCommand(this._logger);
            }
        );

        const createSchemaCommand = vscode.commands.registerCommand(
            'extension.createSchema',
            () => {
                showCreateSchemaInput(this._graphQLService);
            }
        );

        this._ctx.subscriptions.push(showLogCommand);
        this._ctx.subscriptions.push(createSchemaCommand);
    }
}
