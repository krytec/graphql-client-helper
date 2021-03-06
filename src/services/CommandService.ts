import * as vscode from 'vscode';
import { createSchema } from '../commands/SchemaInputCommand';
import { GraphQLService } from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';
import { StateService } from './StateService';
import { Request, RequestNodeProvider } from '../provider/RequestNodeProvider';
import {
    CustomRequest,
    CustomRequestNodeProvider
} from '../provider/CustomRequestNodeProvider';
import { ConfigurationService, Framework } from './ConfigurationService';
import { dedent, sleep, toTitleCase } from '../utils/Utils';
import * as fs from 'fs';
import { join } from 'path';
import { ServiceNodeProvider, Service } from '../provider/ServiceNodeProvider';
import {
    showServiceRequestInCodeCommand,
    showCreateServiceCommand,
    addServiceCommand
} from '../commands/ServiceCommands';
import {
    createRequestFromCode,
    showSaveRequestCommand,
    executeRequestCommand
} from '../commands/RequestCommands';
import * as del from 'del';
import { AbstractServiceGenerator } from '../generators/AbstractServiceGenerator';
import { AngularServiceGenerator } from '../generators/AngularServiceGenerator';
import { ReactServiceGenerator } from '../generators/ReactServiceGenerator';
import { ServiceGenerator } from '../generators/ServiceGenerator';
import { GraphQLClientService } from './GraphQLClientService';
const path = require('path');
/**
 * Service class to create vscode commands and register them to vscode
 */
export class CommandService {
    private _generator: AbstractServiceGenerator;
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
        private _clientService: GraphQLClientService,
        private _requestNodeProvider: RequestNodeProvider,
        private _serviceNodeProvider: ServiceNodeProvider,
        private _customRequestNodeProvider: CustomRequestNodeProvider
    ) {
        this._logger = _stateService.logger;
        this._ctx = this._stateService.context as vscode.ExtensionContext;

        this._generator = new ServiceGenerator(
            this._stateService,
            this._config,
            this._clientService,
            this._graphQLService
        );

        this.workspaceFolderChanged();
        this.onDidFrameworkChangeCallback(_config.framework);
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
                    trigger === _config.generatedFolder
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

        _clientService.onDidExecuteRequest(ms =>
            vscode.window.showInformationMessage(
                'GraphaX: Request finished after ' +
                    (ms / 1000).toFixed(3) +
                    ' seconds.'
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
                .then(async button => {
                    if (button === 'Yes') {
                        await this.workspaceFolderChanged();
                    }
                });
        });

        _config.onDidChangeFramework(e => {
            this.onDidFrameworkChangeCallback(e);
            vscode.window.showInformationMessage(
                'GraphaX: Framework set to ' + toTitleCase(Framework[e])
            );
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
    private async workspaceFolderChanged() {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                cancellable: false,
                title: 'Loading Schema'
            },
            async (progress, token) => {
                vscode.commands.executeCommand(
                    'setContext',
                    'schemaLoaded',
                    false
                );
                if (vscode.workspace.workspaceFolders !== undefined) {
                    const currentFolder =
                        vscode.workspace.workspaceFolders[0].uri.fsPath;
                    const packageJsonPath = path.join(
                        currentFolder,
                        'package.json'
                    );
                    if (fs.existsSync(packageJsonPath)) {
                        this.readPackageJSON(packageJsonPath);
                    } else {
                        this._config.framework = Framework.NONE;
                    }

                    this._graphQLService.folder = currentFolder;

                    const schemaFile = path.join(
                        this._graphQLService.folder,
                        '/schema.gql'
                    );
                    if (fs.existsSync(this._graphQLService.folder)) {
                        progress.report({ message: 'Loading schema' });
                        await this._graphQLService
                            .getSchemaFromFile(schemaFile)
                            .then(async schema => {
                                progress.report({ message: 'Creating types' });
                                this._graphQLService.createTypesFromSchema(
                                    schema
                                );
                                progress.report({
                                    message: 'Creating Requests'
                                });
                                this._graphQLService.getRequestsFromSchema(
                                    schema
                                );
                                progress.report({ message: 'Refreshing view' });
                                this._requestNodeProvider.refresh();
                                if (this._stateService.currentTree.length > 0) {
                                    this._graphQLService.loadGraphaxJSON().then(
                                        resolved =>
                                            vscode.window.showInformationMessage(
                                                resolved
                                            ),
                                        rejected =>
                                            vscode.window.showWarningMessage(
                                                rejected
                                            )
                                    );
                                }
                                this._customRequestNodeProvider.refresh();
                                this._serviceNodeProvider.refresh();
                            })
                            .catch((err: Error) =>
                                vscode.window.showErrorMessage(err.message)
                            );
                    } else {
                        progress.report({ message: 'No schema available' });
                    }
                }
                var p = sleep(1000);
                return p;
            }
        );
    }

    /**
     * Method to get the current used framework out of the packagejson
     * @param packageJsonPath File path of the package.json file
     */
    private readPackageJSON(packageJsonPath: string) {
        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf-8')
        );
        let currentFramework = Framework.NONE;
        Object.keys(packageJson.dependencies).forEach(dep => {
            if (dep.includes('react')) {
                currentFramework = Framework.REACT;
                return;
            } else if (dep.includes('angular')) {
                currentFramework = Framework.ANGULAR;
                return;
            }
        });
        if (currentFramework === Framework.NONE) {
            if (packageJson.devDependencies) {
                Object.keys(packageJson.devDependencies).forEach(dep => {
                    if (dep.includes('react')) {
                        currentFramework = Framework.REACT;
                        return;
                    } else if (dep.includes('angular')) {
                        currentFramework = Framework.ANGULAR;
                        return;
                    }
                });
            }
        }
        this._config.framework = currentFramework;
    }
    /**
     * Callback method which is called when the user changes the framework setting
     * @param framework New selected framework
     */
    private onDidFrameworkChangeCallback(framework) {
        switch (+framework) {
            case Framework.ANGULAR:
                this._generator = new AngularServiceGenerator(
                    this._stateService,
                    this._config,
                    this._clientService,
                    this._graphQLService
                );
                break;
            case Framework.REACT:
                this._generator = new ReactServiceGenerator(
                    this._stateService,
                    this._config,
                    this._clientService,
                    this._graphQLService
                );
                break;
            case Framework.NONE:
                this._generator = new ServiceGenerator(
                    this._stateService,
                    this._config,
                    this._clientService,
                    this._graphQLService
                );
                break;
            default:
                this._generator = new ServiceGenerator(
                    this._stateService,
                    this._config,
                    this._clientService,
                    this._graphQLService
                );
        }
        this._generator.folderPath = this._graphQLService.folder;
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
            'graphax.showLog',
            () => {
                showLogingWindowCommand(this._logger);
            }
        );

        const createSchemaCommand = vscode.commands.registerCommand(
            'graphax.createSchema',
            async () => {
                await createSchema(this._graphQLService, this._config);
                this._requestNodeProvider.refresh();
            }
        );

        const createRequestFromCodeCommand = vscode.commands.registerCommand(
            'graphax.createRequest',
            async () => {
                await vscode.commands
                    .executeCommand('workbench.view.extension.schema-explorer')
                    .then(() => {
                        createRequestFromCode(this._graphQLService).then(() =>
                            this._customRequestNodeProvider.refresh()
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
                    this._customRequestNodeProvider.refresh();
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
            () => this._customRequestNodeProvider.refresh()
        );

        const selectRequestCommand = vscode.commands.registerCommand(
            'list.selectRequest',
            (element: CustomRequest) => {
                element.selected = !element.selected;
                this._customRequestNodeProvider.refresh();
            }
        );

        const runRequestCommand = vscode.commands.registerCommand(
            'list.runRequest',
            (element: CustomRequest) =>
                executeRequestCommand(
                    element,
                    this._clientService,
                    this._stateService
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
                            this._stateService.removeRequest(element);
                            this._customRequestNodeProvider.refresh();
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
                    this._logger,
                    this._generator,
                    myRequests
                );
                this._stateService.myRequests.forEach(
                    request => (request.selected = false)
                );
                this._customRequestNodeProvider.refresh();
                this._serviceNodeProvider.refresh();
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
        const regenerateServiceCommand = vscode.commands.registerCommand(
            'service.regenerate',
            () => {
                this._stateService.services.forEach(service => {
                    if (service.tooltip.includes('React')) {
                        this.onDidFrameworkChangeCallback(Framework.REACT);
                    } else if (service.tooltip.includes('Angular')) {
                        this.onDidFrameworkChangeCallback(Framework.ANGULAR);
                    } else {
                        this.onDidFrameworkChangeCallback(Framework.NONE);
                    }
                    this._generator.regenerateService(service);
                });
                this.onDidFrameworkChangeCallback(this._config.framework);
            }
        );

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
                this._customRequestNodeProvider.refresh();
            }
        );

        const deleteServiceCommand = vscode.commands.registerCommand(
            'service.delete',
            (service: Service) => {
                vscode.window
                    .showWarningMessage(
                        `Do you really want to delete service ${service.label} from your file system?`,
                        'Yes',
                        'No'
                    )
                    .then(async button => {
                        if (button === 'Yes') {
                            if (this._stateService.services.includes(service)) {
                                const dir = del.sync(['*.ts', '*.tsx'], {
                                    cwd: service.path,
                                    force: true
                                });
                                try {
                                    fs.rmdirSync(service.path);
                                } catch (err) {}
                                vscode.window.showInformationMessage(
                                    `Deleted service ${service.label}!`
                                );
                                this._stateService.removeService(service);
                                this._graphQLService.removeServiceFromGraphaxJSON(
                                    service
                                );
                            }
                            this._serviceNodeProvider.refresh();
                        }
                    });
            }
        );

        const deleteRequestFromServiceCommand = vscode.commands.registerCommand(
            'service.request.delete',
            (request: Service) => {
                vscode.window
                    .showWarningMessage(
                        `Do you really want to delete request ${request.label} from your service?`,
                        'Yes',
                        'No'
                    )
                    .then(button => {
                        if (button === 'Yes') {
                            this._generator.deleteRequestFromService(request);
                            let currentService: Service | undefined;
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
            (request: Service) => {
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
        this._ctx.subscriptions.push(regenerateServiceCommand);
        this._ctx.subscriptions.push(createServiceCommand);
        this._ctx.subscriptions.push(serviceCodeCommand);
        this._ctx.subscriptions.push(deleteRequestFromServiceCommand);
        this._ctx.subscriptions.push(refreshServicesCommand);
        this._ctx.subscriptions.push(deleteServiceCommand);
    }
}
