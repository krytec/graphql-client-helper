// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showCreateSchemaInput } from './commands/SchemaInputCommand';
import GraphQLUtils from './services/GraphQLService';
import GraphQLService from './services/GraphQLService';
import { CommandService } from './services/CommandService';
import { LoggingService } from './services/LoggingService';
import { generatedFolder } from './constants';
import { StateService } from './services/StateService';
import { RequestNodeProvider } from './services/RequestNodeProvider';
import { RequestService } from './services/RequestService';
import { stringToGraphQLFormat } from './utils/Utils';
const path = require('path');
// this method is called when your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "graphql-client-helper" is now active!'
    );

    console.log(
        stringToGraphQLFormat(
            `query myQuery($name:String!){ pokemon(name:$name){id}}`
        )
    );

    //create instance of services
    const loggingService = new LoggingService();
    const stateService = new StateService(loggingService, context);
    const graphQLService = new GraphQLService(stateService);
    const commandService = new CommandService(stateService, graphQLService);
    // Adds a new TreeView to vscode
    const requestService = new RequestService(stateService, loggingService);
    // Register commands here -> commands can be found in the /commands directory
    commandService.registerCommands();
}

// this method is called when your extension is deactivated
export function deactivate() {}
