// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showCreateSchemaInput } from './commands/SchemaInputCommand';
import GraphQLUtils from './services/GraphQLService';
import GraphQLService from './services/GraphQLService';
import { CommandService } from './services/CommandService';
import { LoggingService } from './services/LoggingService';
import { generatedFolder } from './constants';
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
    const graphQLService = new GraphQLService(loggingService);
    const commandService = new CommandService(context,graphQLService,loggingService);
    
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    // Register commands here -> commands can be found in the /commands directory
    commandService.registerCommands();
    
}

// this method is called when your extension is deactivated
export function deactivate() {}
