import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ClientService } from '../services/ClientService';
import * as vscode from 'vscode';
import { CircularQuickInput } from '../provider/CircularQuickInputProvider';
import { StateService } from '../services/StateService';
import { Request } from '../provider/RequestNodeProvider';
import { stringToGraphQLObject } from '../utils/Utils';
import { GraphQLService } from '../services/GraphQLService';

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

export async function createRequestFromCode(
    state: StateService,
    graphqlService: GraphQLService
) {
    const te = vscode.window.activeTextEditor;
    if (te !== undefined) {
        const range = te.selection;
        const selection = te.document.getText(range);
        let request: CustomRequest | undefined = undefined;
        getRequestFromString(state, graphqlService, selection);
    }
}

export async function getRequestFromString(
    state: StateService,
    graphqlService: GraphQLService,
    requestAsString: string
): Promise<CustomRequest> {
    return new Promise<CustomRequest>(async (resolve, reject) => {
        let request: Request | undefined = undefined;
        try {
            request = await selectionValidation(requestAsString, state);
            if (request) {
                const nameMatch: any = requestAsString.match(
                    /(?!(query$|mutation$)\s*)[a-zA-Z]+[a-zA-Z0-9]*/g
                );
                const name = nameMatch[1];
                let result = await setRequestVariables(
                    stringToGraphQLObject(requestAsString),
                    request
                );
                let customRequest = await graphqlService.saveRequest(
                    name,
                    result
                );
                if (customRequest) {
                    request.deselect();
                    resolve(customRequest);
                }
            }
        } catch (error) {
            request?.deselect();
            vscode.window.showErrorMessage(error.message);
        }
    });
}

//#region Helperfunctions
async function selectionValidation(
    selection: string,
    state: StateService
): Promise<Request> {
    return new Promise<Request>((resolve, reject) => {
        if (
            /**
             * * Regex to match the beginning of a query | mutation
             * * (query|mutation){1} [a-zA-Z]+(\((\$[a-zA-Z]+:\s*[a-zA-Z]+(\!)?((,\s?)|\)))+)*\s*{
             * * Has to start with "query" or "mutation", then has a name that doesnt start with a digit
             * * After that takes care that the query has either zero or at least one argument in form of "$argument:scalar"
             * * Followed by an optional !. After that makes sure that either another argument is provided and seperated by a ,
             * * or the bracket is closed with a ) after that the query starts with an {
             */
            !selection.match(
                /(query|mutation){1} [a-zA-Z]+[a-zA-Z0-9]*(\((\$[a-zA-Z]+:\s*[a-zA-Z]+(\!)?((,\s?)|\)))+)*\s*{/g
            )
        ) {
            throw new Error('Invalid request format');
        } else {
            let requestname = '';
            const request = selection.match(/(?:\r\n?|\n)\s.*/g);
            if (request) {
                requestname = request[0].split('(')[0].trim();
                const graphqlrequest:
                    | Request
                    | undefined = state.currentTree.find(
                    req => req.label === requestname
                );
                if (graphqlrequest) {
                    resolve(graphqlrequest);
                }
            } else {
                throw new Error('Request was not found in schema');
            }
            reject();
        }
    });
}

async function setRequestVariables(
    documentAST,
    request: Request
): Promise<Request> {
    return new Promise<Request>((resolve, reject) => {
        var def = documentAST.definitions[0];
        var fields = def.selectionSet.selections[0].selectionSet;
        fields.selections.forEach(async element => {
            await selectField(element, request.fields).then(
                () => resolve(request),
                () => reject()
            );
        });
    });
}

async function selectField(field, requestFields: Request[]): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        if (field.selectionSet) {
            field.selectionSet.selections.forEach(selection => {
                requestFields.forEach(req => {
                    if (req.label === field.name.value) {
                        selectField(selection, req.fields);
                    }
                });
            });
        } else {
            requestFields.forEach(req => {
                if (req.label === field.name.value) {
                    req.selected = true;
                    resolve(true);
                }
            });
        }
        reject(false);
    });
}
//#endregion
