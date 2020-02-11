import { Request, RequestNodeProvider } from '../provider/RequestNodeProvider';
import { GraphQLService } from '../services/GraphQLService';
import * as vscode from 'vscode';

export async function showSaveRequestCommand(
    element: Request,
    graphQLService: GraphQLService
) {
    await vscode.window
        .showInputBox({
            placeHolder: 'Enter a name for your request',
            validateInput: text => {
                return text !== undefined &&
                    text.match(/^[a-zA-Z][a-zA-Z0-9]*$/g)
                    ? null
                    : 'Error: A request has to be a string and can`t start with a number!';
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
