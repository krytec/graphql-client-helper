import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { Request } from '../provider/RequestNodeProvider';
import { stringToGraphQLObject } from '../utils/Utils';
import { GraphQLService } from '../services/GraphQLService';

export async function createRequestFromCode(
    state: StateService,
    graphqlService: GraphQLService
) {
    const te = vscode.window.activeTextEditor;
    if (te !== undefined) {
        const range = te.selection;
        const selection = te.document.getText(range);
        try {
            let request = await selectionValidation(selection, state);
            if (request) {
                const nameMatch: any = selection.match(
                    /[^(mutation|query)\s][a-zA-Z]+[a-zA-Z0-9]*/
                );
                const name = nameMatch[0];
                let result = await setRequestVariables(
                    stringToGraphQLObject(selection),
                    request
                );
                await graphqlService.saveRequest(name, result);
                request.deselect();
            }
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
    }
}

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
