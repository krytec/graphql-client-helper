import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import * as vscode from 'vscode';
import { CircularQuickInput } from '../provider/CircularQuickInputProvider';
import { StateService } from '../services/StateService';
import { Request } from '../provider/RequestNodeProvider';
import { stringToGraphQLObject, sleep } from '../utils/Utils';
import { GraphQLService } from '../services/GraphQLService';
import { OperationDefinitionNode, FieldNode, graphql } from 'graphql';
import { GraphQLClientService } from '../services/GraphQLClientService';

/**
 * Executes a request with the internal graphqlclient,
 * provides user the option to insert a value for an argument
 * @param node The request that should be executed
 * @param client GraphQLClient
 */
export async function executeRequestCommand(
    node: CustomRequest,
    client: GraphQLClientService,
    state: StateService
) {
    const quickInput = new CircularQuickInput(state, node.label, node.args);
    await quickInput.show().then(async vars => {
        await client
            .executeRequest(node.request, JSON.parse(vars))
            .then(async data => {
                let uri = vscode.Uri.parse(
                    'request:' + node.label + `.json?` + data
                );
                let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
                await vscode.window.showTextDocument(doc, { preview: false });
            })
            .catch(error => {
                if (error !== undefined) {
                    vscode.window.showErrorMessage(error);
                }
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
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Create request',
            cancellable: true
        },
        async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage(
                    'Cancelled request creation!'
                );
            });
            progress.report({ increment: 33 });
            let done = false;
            while (!done) {
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
                    .then(async value => {
                        if (value !== undefined) {
                            value = element.query
                                ? value + 'Query'
                                : value + 'Mutation';
                            progress.report({
                                increment: 66,
                                message: `Creating request ${value}...`
                            });
                            await graphQLService
                                .saveRequest(value, element)
                                .then(
                                    async onresolved => {
                                        progress.report({
                                            increment: 100,
                                            message: `Finished creating request ${value}`
                                        });
                                        await sleep(1500);
                                        done = true;
                                    },
                                    onrejected => {
                                        progress.report({
                                            increment: 33,
                                            message: `Request ${value} already exists! Please provide a unique name for your request!`
                                        });
                                    }
                                );
                        } else {
                            vscode.window.showInformationMessage(
                                'Cancelled request creation!'
                            );
                            done = true;
                        }
                    });
            }
        }
    );
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
        await graphqlService.getRequestFromString(selection).then(
            resolve => {
                if (resolve) {
                    vscode.window.showInformationMessage(
                        'Addet request ' + resolve.label + ' to GraphaX.'
                    );
                }
            },
            rejects => {
                const errors = rejects.map(err => err.message).join(' ');
                vscode.window.showErrorMessage(
                    `Could not add request to GraphaX: ${errors}`
                );
            }
        );
    }
}
