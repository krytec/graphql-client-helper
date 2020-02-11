import * as vscode from 'vscode';
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import { GraphQLService } from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';
import { StateService } from './StateService';
import { showSaveRequestCommand } from '../commands/SaveRequestCommand';
import { Request, RequestNodeProvider } from '../provider/RequestNodeProvider';
import {
    CustomRequest,
    SavedRequestNodeProvider
} from '../provider/SavedRequestNodeProvider';
import { ConfigurationService, Framework } from './ConfigurationService';
import { ClientService } from './ClientService';
import { executeRequestCommand } from '../commands/ExecuteRequestCommand';
import { showCreateServiceCommand } from '../commands/CreateServiceCommand';
import { dedent } from '../utils/Utils';
import * as fs from 'fs';
import { join } from 'path';

const path = require('path');
/**
 * Service class to create vscode commands and register them to vscode
 */
export class CommandService {
    private _logger: LoggingService;
    private _ctx: vscode.ExtensionContext;
    private _fsWatcher: fs.FSWatcher;
    private _outputChannel = vscode.window.createOutputChannel(
        'Graphax Client'
    );
    /**
     * Constructor
     * @param _stateService The stateService of the extension
     * @param _graphQLService GraphQLService
     */
    constructor(
        private _stateService: StateService,
        private _config: ConfigurationService,
        private _graphQLService: GraphQLService,
        private _client: ClientService,
        private _requestNodeProvider: RequestNodeProvider,
        private _savedRequestNodeProvider: SavedRequestNodeProvider
    ) {
        this._logger = _stateService.logger;
        this._ctx = this._stateService.context as vscode.ExtensionContext;
        this.workspaceFolderChanged();
        try {
            this._fsWatcher = fs.watch(
                _graphQLService.folder,
                'utf-8',
                (event, trigger) => this.fileSystemCallback(event, trigger)
            );
        } catch (e) {
            this._fsWatcher = fs.watch(
                join(_graphQLService.folder, '..'),
                'utf-8',
                trigger =>
                    trigger === 'graphqlschema'
                        ? this.workspaceFolderChanged()
                        : null
            );
        }
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.workspaceFolderChanged();
            this._fsWatcher.close();
            this._fsWatcher = fs.watch(
                _graphQLService.folder,
                'utf-8',
                (event, trigger) => this.fileSystemCallback(event, trigger)
            );
        });

        _client.onDidExecuteRequest(ms =>
            vscode.window.showInformationMessage(
                'Request finished after ' + ms + 'ms.'
            )
        );

        _config.onDidChangeFolder(e => {
            vscode.window
                .showInformationMessage(
                    dedent`Generated folder changed to: ${e},
                    Would you like to reload the extension?
                    Warning! All unsaved requests will be lost!`,
                    'Yes',
                    'No'
                )
                .then(button => {
                    if (button === 'Yes') {
                        this.workspaceFolderChanged();
                    }
                });
        });

        _config.onDidChangeFramework(e => {
            this.workspaceFolderChanged();
        });

        /**
         * * Event callback that emmits an informationmessage
         * * when the endpoint was changed in the settings
         */
        _config.onDidChangeEndpoint(e => {
            if (e !== 'User') {
                vscode.window
                    .showInformationMessage(
                        dedent`Endpoint changed to ${e},
                    Would you like to reload the schema?`,
                        'Yes',
                        'No'
                    )
                    .then(button => {
                        if (button === 'Yes') {
                            this._graphQLService
                                .getSchemaFromEndpoint(e)
                                .catch(e => {
                                    vscode.window.showErrorMessage(e);
                                });
                        }
                    });
            }
        });
    }

    /**
     * Callback method that listens to the workspacefolderschangedevent
     */
    private workspaceFolderChanged() {
        vscode.commands.executeCommand('setContext', 'schemaLoaded', false);
        if (vscode.workspace.workspaceFolders !== undefined) {
            this._graphQLService.folder =
                vscode.workspace.workspaceFolders[0].uri.fsPath;

            const schemaFile = path.join(
                this._graphQLService.folder,
                '/schema.gql'
            );

            this._graphQLService
                .getSchemaFromFile(schemaFile)
                .then(schema => {
                    this._graphQLService.createTypesFromSchema(schema);
                    this._graphQLService.getRequestsFromSchema(schema);
                    this._requestNodeProvider.refresh();
                })
                .catch((err: Error) =>
                    vscode.window.showErrorMessage(err.message)
                );
        }
    }

    private fileSystemCallback(event, trigger) {
        if (trigger === 'schema.gql') {
            if (
                !fs.existsSync(path.join(this._graphQLService.folder, trigger))
            ) {
                vscode.commands.executeCommand(
                    'setContext',
                    'schemaLoaded',
                    false
                );
            }
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
                showCreateSchemaInput(this._graphQLService, this._config);
            }
        );

        const saveRequestCommand = vscode.commands.registerCommand(
            'tree.saveRequest',
            async (element: Request) => {
                if (element.selected) {
                    await showSaveRequestCommand(element, this._graphQLService);
                    element.deselect();
                    this._requestNodeProvider.refresh();
                    this._savedRequestNodeProvider.refresh();
                } else {
                    vscode.window.showErrorMessage(
                        'You must select at least one field of the request!'
                    );
                }
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
                element.selected = !element.selected;
                this._requestNodeProvider.refresh();
            }
        );

        const refreshListCommand = vscode.commands.registerCommand(
            'list.refresh',
            () => this._savedRequestNodeProvider.refresh()
        );

        const selectRequestCommand = vscode.commands.registerCommand(
            'list.selectRequest',
            (element: CustomRequest) => {
                element.selected = !element.selected;
                this._savedRequestNodeProvider.refresh();
            }
        );

        const runRequestCommand = vscode.commands.registerCommand(
            'list.runRequest',
            (element: CustomRequest) =>
                executeRequestCommand(
                    element,
                    this._client,
                    this._outputChannel
                )
        );

        const deleteRequestCommand = vscode.commands.registerCommand(
            'list.delete',
            (element: CustomRequest) => {
                vscode.window
                    .showInformationMessage(
                        `Do you really want to delete request:${element.label}?`,
                        'Yes',
                        'No'
                    )
                    .then(value => {
                        if (value === 'Yes') {
                            const index = this._stateService.myRequests.indexOf(
                                element,
                                0
                            );
                            if (index > -1) {
                                this._stateService.myRequests.splice(index, 1);
                                this._savedRequestNodeProvider.refresh();
                            }
                        }
                    });
            }
        );

        const createServiceCommand = vscode.commands.registerCommand(
            'list.save',
            () => {
                const myRequests = this._stateService.myRequests.filter(
                    request => request.selected === true
                );
                this._stateService.myRequests.forEach(
                    request => (request.selected = false)
                );
                this._savedRequestNodeProvider.refresh();
                showCreateServiceCommand(this._graphQLService, myRequests);
            }
        );

        const showRequestInCodeCommand = vscode.commands.registerCommand(
            'list.showRequest',
            async (element: CustomRequest) => {
                let uri = vscode.Uri.parse(
                    'request:' + element.label + '.graphql?' + element.request
                );
                let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
                await vscode.window.showTextDocument(doc, { preview: false });
            }
        );

        this._ctx.subscriptions.push(showLogCommand);
        this._ctx.subscriptions.push(createSchemaCommand);
        this._ctx.subscriptions.push(selectFieldCommand);
        this._ctx.subscriptions.push(saveRequestCommand);
        this._ctx.subscriptions.push(refreshCommand);
        this._ctx.subscriptions.push(refreshListCommand);
        this._ctx.subscriptions.push(selectRequestCommand);
        this._ctx.subscriptions.push(runRequestCommand);
        this._ctx.subscriptions.push(showRequestInCodeCommand);
        this._ctx.subscriptions.push(deleteRequestCommand);
        this._ctx.subscriptions.push(createServiceCommand);
    }
}
