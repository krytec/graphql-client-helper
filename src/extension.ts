// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GraphQLService } from './services/GraphQLService';
import { CommandService } from './services/CommandService';
import { LoggingService } from './services/LoggingService';
import { StateService } from './services/StateService';
import { RequestNodeProvider } from './provider/RequestNodeProvider';
import { CustomRequestNodeProvider } from './provider/CustomRequestNodeProvider';
import { ConfigurationService } from './services/ConfigurationService';
import { RequestDocumentProvider } from './provider/RequestDocumentProvider';
import { ServiceNodeProvider } from './provider/ServiceNodeProvider';
import { GraphQLClientService } from './services/GraphQLClientService';
import { RequestCompletionProvider } from './provider/RequestCompletionProvider';
import { DecorationProvider } from './provider/DecorationProvider';
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
    const clientService = new GraphQLClientService(configurationService);
    // Create a node provider and adds a new TreeView to vscode
    const requestNodeProvider = new RequestNodeProvider(stateService);
    const customRequestNodeProvider = new CustomRequestNodeProvider(
        stateService
    );
    const serviceNodeProvider = new ServiceNodeProvider(stateService);
    vscode.window.registerTreeDataProvider(
        'requestView',
        customRequestNodeProvider
    );
    vscode.window.registerTreeDataProvider('serviceView', serviceNodeProvider);
    vscode.window.registerTreeDataProvider(
        'schemaExplorer',
        requestNodeProvider
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
        serviceNodeProvider,
        customRequestNodeProvider
    );
    commandService.registerCommands();
    const decorator = new DecorationProvider(stateService);
    vscode.languages.registerCompletionItemProvider(
        { pattern: '**/**.gql' },
        new RequestCompletionProvider(stateService)
    );
}

// this method is called when your extension is deactivated
export function deactivate() {}
