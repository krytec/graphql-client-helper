import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ClientService } from '../services/ClientService';
import * as vscode from 'vscode';
import { CircularQuickInput } from '../provider/CircularQuickInputProvider';
import { StateService } from '../services/StateService';
import { Request } from '../provider/RequestNodeProvider';
import { stringToGraphQLObject } from '../utils/Utils';
import { GraphQLService } from '../services/GraphQLService';
import { OperationDefinitionNode, FieldNode, graphql } from 'graphql';

/**
 * Executes a request with the internal graphqlclient,
 * provides user the option to insert a value for an argument
 * @param node The request that should be executed
 * @param client GraphQLClient
 */
export async function executeRequestCommand(
    node: CustomRequest,
    client: ClientService
) {
    const quickInput = new CircularQuickInput(node.label, node.args);
    await quickInput.show().then(vars => {
        client
            .executeRequest(node.request, JSON.parse(vars))
            .then(async data => {
                let uri = vscode.Uri.parse(
                    'request:' + node.label + `.json?` + data
                );
                let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
                await vscode.window.showTextDocument(doc, { preview: false });
            })
            .catch(error => {
                var obj = JSON.parse(error);
                vscode.window.showErrorMessage(obj.response.errors[0].message);
            });
    });
}

/**
 * Async function to get a name for a customrequest and save the request as customrequest
 * @param element Request that should be saved
 * @param graphQLService GraphQlService
 */
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
                // graphQLService.saveRequest(value, element).catch(error => {
                //     vscode.window.showErrorMessage(error);
                //     vscode.commands.executeCommand('tree.saveRequest', element);
                // });
                graphQLService.saveRequest(value, element).then(
                    onresolved => {},
                    onrejected => {
                        vscode.window.showErrorMessage(
                            'A request with the name ' +
                                onrejected.label +
                                ' already exists! Please provide a unique name.'
                        );
                        vscode.commands.executeCommand(
                            'tree.saveRequest',
                            element
                        );
                    }
                );
            } else {
                vscode.window.showErrorMessage(
                    'Error: Please name your request!'
                );
            }
        });
}

/**
 * Async function to create a request from code
 * @param state State of the extension
 * @param graphqlService GraphQlService
 */
export async function createRequestFromCode(graphqlService: GraphQLService) {
    const te = vscode.window.activeTextEditor;
    if (te !== undefined) {
        const range = te.selection;
        const selection = te.document.getText(range);
        let request: CustomRequest | undefined = undefined;
        graphqlService.getRequestFromString(selection);
    }
}
