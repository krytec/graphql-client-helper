// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showCreateSchemaInput } from './commands/SchemaInputCommand';
import GraphQLUtils from './services/GraphQLService';
import GraphQLService from './services/GraphQLService';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(
        'Congratulations, your extension "graphql-client-helper" is now active!'
    );
    //create an instance of a graphqlservice and pass it to the commands
    const graphQLService = new GraphQLService();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    // Register commands here -> commands can be found in the /commands directory
    const createSchemaCommand = vscode.commands.registerCommand(
        'extension.createSchema',
        () => {
            showCreateSchemaInput(graphQLService);
        }
    );
    context.subscriptions.push(createSchemaCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
