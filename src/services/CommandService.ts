import * as vscode from 'vscode';
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import { GraphQLService } from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';
import { StateService } from './StateService';
import { Request, RequestNodeProvider } from '../provider/RequestNodeProvider';
import {
    CustomRequest,
    SavedRequestNodeProvider
} from '../provider/SavedRequestNodeProvider';
import { ConfigurationService, Framework } from './ConfigurationService';
import { ClientService } from './ClientService';
import { dedent } from '../utils/Utils';
import * as fs from 'fs';
import { join } from 'path';
import {
    ServiceNodeProvider,
    ServiceNode
} from '../provider/ServiceNodeProvider';
import {
    showServiceRequestInCodeCommand,
    showCreateServiceCommand,
    deleteRequestFromService,
    addServiceCommand
} from '../commands/ServiceCommands';
import {
    createRequestFromCode,
    showSaveRequestCommand,
    executeRequestCommand
} from '../commands/RequestCommands';
import * as del from 'del';
const path = require('path');
/**
 * Service class to create vscode commands and register them to vscode
 */
export class CommandService {
    private _logger: LoggingService;
    private _ctx: vscode.ExtensionContext;
    private _fsWatcher: fs.FSWatcher;
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
        private _serviceNodeProvider: ServiceNodeProvider,
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
        //#region extension
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

        const createRequestFromCodeCommand = vscode.commands.registerCommand(
            'graphax.createRequest',
            async () => {
                await vscode.commands
                    .executeCommand('workbench.view.extension.schema-explorer')
                    .then(() => {
                        createRequestFromCode(this._graphQLService).then(() =>
                            this._savedRequestNodeProvider.refresh()
                        );
                    });
            }
        );
        //#endregion

        //#region schemaView
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

        //#endregion

        //#region requestView
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
                executeRequestCommand(element, this._client)
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
            async () => {
                const myRequests = this._stateService.myRequests.filter(
                    request => request.selected === true
                );
                await showCreateServiceCommand(
                    this._stateService,
                    this._graphQLService,
                    myRequests
                );
                this._stateService.myRequests.forEach(
                    request => (request.selected = false)
                );
                this._savedRequestNodeProvider.refresh();
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

        //#endregion

        //#region ServiceCommands
        const refreshServicesCommand = vscode.commands.registerCommand(
            'service.refresh',
            () => this._serviceNodeProvider.refresh()
        );

        const addServiceFromFolderCommand = vscode.commands.registerCommand(
            'service.add',
            (folder: vscode.Uri) => {
                this._requestNodeProvider.getChildren();
                addServiceCommand(this._graphQLService, folder.fsPath);
                this._serviceNodeProvider.refresh();
            }
        );

        const deleteServiceCommand = vscode.commands.registerCommand(
            'service.delete',
            (service: ServiceNode) => {
                vscode.window
                    .showWarningMessage(
                        `Do you really want to delete service ${service.label} from your file system?`,
                        'Yes',
                        'No'
                    )
                    .then(async button => {
                        if (button === 'Yes') {
                            //! TODO: Implement logic to delete a service from files
                            if (this._stateService.services.includes(service)) {
                                const dir = del.sync('*.ts', {
                                    cwd: service.path
                                });
                                vscode.window.showInformationMessage(
                                    `Deleted service ${service.label}!`
                                );
                                var idx = this._stateService.services.indexOf(
                                    service
                                );
                                this._stateService.services.splice(idx, 1);
                            }
                            this._serviceNodeProvider.refresh();
                        }
                    });
            }
        );

        const deleteRequestFromServiceCommand = vscode.commands.registerCommand(
            'service.request.delete',
            (request: ServiceNode) => {
                vscode.window
                    .showWarningMessage(
                        `Do you really want to delete request ${request.label} from your service?`,
                        'Yes',
                        'No'
                    )
                    .then(button => {
                        if (button === 'Yes') {
                            //! TODO: Implement logic to delete a request from a service
                            deleteRequestFromService(
                                request,
                                this._config.framework
                            );
                            let currentService: ServiceNode | undefined;
                            this._stateService.services.forEach(service => {
                                if (service.requests.includes(request)) {
                                    currentService = service;
                                    var idx = service.requests.indexOf(request);
                                    service.requests.splice(idx, 1);
                                }
                            });
                            if (currentService) {
                                if (currentService.requests.length === 0) {
                                    vscode.commands.executeCommand(
                                        'service.delete',
                                        currentService
                                    );
                                }
                            }
                            this._serviceNodeProvider.refresh();
                        }
                    });
            }
        );

        const serviceCodeCommand = vscode.commands.registerCommand(
            'service.request.code',
            (request: ServiceNode) => {
                showServiceRequestInCodeCommand(request);
            }
        );
        //#endregion
        this._ctx.subscriptions.push(showLogCommand);
        this._ctx.subscriptions.push(createSchemaCommand);
        this._ctx.subscriptions.push(createRequestFromCodeCommand);
        this._ctx.subscriptions.push(selectFieldCommand);
        this._ctx.subscriptions.push(saveRequestCommand);
        this._ctx.subscriptions.push(refreshCommand);
        this._ctx.subscriptions.push(refreshListCommand);
        this._ctx.subscriptions.push(selectRequestCommand);
        this._ctx.subscriptions.push(runRequestCommand);
        this._ctx.subscriptions.push(addServiceFromFolderCommand);
        this._ctx.subscriptions.push(showRequestInCodeCommand);
        this._ctx.subscriptions.push(deleteRequestCommand);
        this._ctx.subscriptions.push(createServiceCommand);
        this._ctx.subscriptions.push(serviceCodeCommand);
        this._ctx.subscriptions.push(deleteRequestFromServiceCommand);
        this._ctx.subscriptions.push(refreshServicesCommand);
        this._ctx.subscriptions.push(deleteServiceCommand);
    }
}
