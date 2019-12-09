// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import GraphQLUtils from './Utils/GraphQLUtils';
import { isValidURL } from './Utils/Utils';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "graphql-client-helper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	// Runs an introspection query on given endpoint and creates a schema file
	let createSchema = vscode.commands.registerCommand('extension.createSchema', () => {
		vscode.window.showInputBox().then((value) => {
			if(value !== undefined && isValidURL(value)){	
				if(vscode.workspace.workspaceFolders !== undefined){
					let pathToFolder = vscode.workspace.workspaceFolders[0];
					let util = new GraphQLUtils(pathToFolder.uri.fsPath);
					let schema = util.getSchemaFromEndpoint(value)
						.catch(error => vscode.window.showErrorMessage('Error creating Schema:'+ error));								
					
				}else{
					vscode.window.showErrorMessage("No workspace opened!");
				}
			}else{
				vscode.window.showErrorMessage('Invalid path provided!');
			}
		});
	});

	context.subscriptions.push(createSchema);
}

// this method is called when your extension is deactivated
export function deactivate() {}
