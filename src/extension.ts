// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showCreateSchemaInput } from './commands/SchemaInputCommand';
import { GraphQLService } from './services/GraphQLService';
import { CommandService } from './services/CommandService';
import { LoggingService } from './services/LoggingService';
import { StateService } from './services/StateService';
import { RequestNodeProvider } from './provider/RequestNodeProvider';
import { RequestService } from './services/RequestService';
import { stringToGraphQLFormat } from './utils/Utils';
import {
    SavedRequestNodeProvider,
    CustomRequest
} from './provider/SavedRequestNodeProvider';
import { ConfigurationService } from './services/ConfigurationService';
import { ClientService } from './services/ClientService';
import { RequestDocumentProvider } from './provider/RequestDocumentProvider';
const path = require('path');
// this method is called when your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "graphql-client-helper" is now active!'
    );

    //create instance of services
    const loggingService = new LoggingService();
    const configurationService = new ConfigurationService();
    const stateService = new StateService(loggingService, context);
    const graphQLService = new GraphQLService(
        stateService,
        configurationService
    );
    const clientService = new ClientService(stateService, configurationService);
    //clientService.executeRequest(query, vars);
    // Create a node provider and adds a new TreeView to vscode
    const requestNodeProvider = new RequestNodeProvider(stateService);
    const savedRequestNodeProvider = new SavedRequestNodeProvider(stateService);
    const requestService = new RequestService(requestNodeProvider);
    vscode.window.registerTreeDataProvider(
        'requestView',
        savedRequestNodeProvider
    );
    const requestDocumentProvider = new RequestDocumentProvider();
    vscode.workspace.registerTextDocumentContentProvider(
        'request',
        requestDocumentProvider
    );
    // Register commands here -> commands can be found in the /commands directory
    const commandService = new CommandService(
        stateService,
        configurationService,
        graphQLService,
        clientService,
        requestNodeProvider,
        savedRequestNodeProvider
    );
    commandService.registerCommands();
}

// this method is called when your extension is deactivated
export function deactivate() {}
