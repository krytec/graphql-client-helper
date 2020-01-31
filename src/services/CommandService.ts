import * as vscode from 'vscode';
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import GraphQLService from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';
import { StateService } from './StateService';
import { generatedFolder } from '../constants';
import { showSaveRequestCommand } from '../commands/SaveRequestCommand';
import { Request, RequestNodeProvider } from './RequestNodeProvider';
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
        private _graphQLService: GraphQLService,
        private _requestNodeProvider: RequestNodeProvider
    ) {
        this._logger = _stateService.logger;
        this._ctx = this._stateService.context as vscode.ExtensionContext;
        this.workspaceFolderChanged();
        vscode.workspace.onDidChangeWorkspaceFolders(
            () => this.workspaceFolderChanged
        );
    }

    /**
     * Callback method that listens to the workspacefolderschangedevent
     */
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
     * Method to register all commands in the extension
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

        const saveRequestCommand = vscode.commands.registerCommand(
            'tree.saveRequest',
            (element: Request) => {
                showSaveRequestCommand(element, this._graphQLService);
            }
        );

        const refreshCommand = vscode.commands.registerCommand(
            'tree.refresh',
            () => {
                this._requestNodeProvider.refresh();
            }
        );

        const selectFieldCommand = vscode.commands.registerCommand(
            'tree.selectField',
            (element: Request) => {
                element.selected = true;
                this._requestNodeProvider.refresh();
            }
        );

        const deselectFieldCommand = vscode.commands.registerCommand(
            'tree.deselectField',
            (element: Request) => {
                element.selected = false;
                this._requestNodeProvider.refresh();
            }
        );

        this._ctx.subscriptions.push(showLogCommand);
        this._ctx.subscriptions.push(createSchemaCommand);
        this._ctx.subscriptions.push(selectFieldCommand);
        this._ctx.subscriptions.push(saveRequestCommand);
        this._ctx.subscriptions.push(deselectFieldCommand);
        this._ctx.subscriptions.push(refreshCommand);
    }
}
