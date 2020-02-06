import { Request, RequestNodeProvider } from '../provider/RequestNodeProvider';
import GraphQLService from '../services/GraphQLService';
import * as vscode from 'vscode';

export async function showSaveRequestCommand(
    element: Request,
    graphQLService: GraphQLService
) {
    await vscode.window
        .showInputBox({
            placeHolder: 'Enter a name for your request',
            validateInput: text => {
                return text !== undefined && text.trim().length > 0
                    ? null
                    : 'Error: Please name your request!';
            }
        })
        .then(value => {
            if (value !== undefined) {
                value = element.query ? value + 'Query' : value + 'Mutation';
                graphQLService.saveRequest(value, element).catch(error => {
                    vscode.window.showErrorMessage(error);
                    vscode.commands.executeCommand('tree.saveRequest', element);
                });
            } else {
                vscode.window.showErrorMessage(
                    'Error: Please name your request!'
                );
            }
        });
}
