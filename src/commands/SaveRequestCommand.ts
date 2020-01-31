import { Request, RequestNodeProvider } from '../services/RequestNodeProvider';
import GraphQLService from '../services/GraphQLService';
import * as vscode from 'vscode';

export function showSaveRequestCommand(
    element: Request,
    graphQLService: GraphQLService
) {
    vscode.window
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
                graphQLService.saveRequest(value, element);
            } else {
                vscode.window.showErrorMessage(
                    'Error: Please name your request!'
                );
            }
        });
}
