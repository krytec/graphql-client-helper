import { ServiceNode } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { GraphQLService } from '../services/GraphQLService';
import { Framework } from '../services/ConfigurationService';
import * as fs from 'fs';
import request from 'graphql-request';
import { join, basename } from 'path';
import { stringToGraphQLFormat } from '../utils/Utils';

/**
 * Provides a CreateServiceCommand which executes the createService
 * method of the GraphQLService
 * @param service GraphQLService
 * @param requests Selected request
 */
export async function showCreateServiceCommand(
    state: StateService,
    service: GraphQLService,
    requests: CustomRequest[]
) {
    await vscode.window
        .showInputBox({
            prompt: 'Please provide a name for your service',
            validateInput: text => {
                return text !== undefined
                    ? null
                    : 'Please provide a name for your service';
            }
        })
        .then(value => {
            if (value !== undefined) {
                // ! TODO: Provide way to show created files and correctly implementation
                service
                    .createService(value, requests)
                    .then(files => {
                        files.forEach(file => {
                            vscode.workspace
                                .openTextDocument(vscode.Uri.file(file))
                                .then(doc =>
                                    vscode.window.showTextDocument(doc)
                                );
                        });
                    })
                    .catch(error => {});
            }
        });
}

/**
 * Async function to add a service to the extension
 * @param graphqlService GraphQLService
 * @param fsPath Path of the service that should be addet to the extension
 */
export async function addServiceCommand(
    graphqlService: GraphQLService,
    fsPath: string
) {
    graphqlService.createServiceFromFolder(fsPath).then(
        () => {
            vscode.commands.executeCommand(
                'workbench.view.extension.schema-explorer'
            );
        },
        err => vscode.window.showErrorMessage(err.message)
    );
}

/**
 * Async function to show a selected request in code
 * @param request Request that should be shown in code
 */
export async function showServiceRequestInCodeCommand(request: ServiceNode) {
    if (request.request) {
        const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.file(request.path)
        );
        const text = vscode.window.showTextDocument(doc).then(te => {
            let range = getTextRange(doc, request.label, '`;');
            te.selection = new vscode.Selection(range.start, range.end);
        });
    }
}

/**
 * Async function to delete a request from the service
 * @param request Request that should be deleted
 * @param framework Framework that is currently used
 */
export async function deleteRequestFromService(
    request: ServiceNode,
    framework: Framework
) {
    switch (+framework) {
        case Framework.ANGULAR:
            break;
        case Framework.NONE:
            const doc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            let range = getTextRange(
                doc,
                `export const ${request.label}`,
                '`;'
            );
            doc.getText(range);
            vscode.window.showTextDocument(doc).then(te => {
                te.edit(editBuilder => {
                    editBuilder.replace(range, '');
                });
            });
            break;
    }
}

/**
 * Function to select a range from a vscode.TextDocument from textStart to textEnd
 * @param doc vscode.TextDocument
 * @param textStart Start string
 * @param textEnd End string
 */
function getTextRange(
    doc: vscode.TextDocument,
    textStart: string,
    textEnd: string
): vscode.Range {
    let start = 0;
    let startChar = 0;
    let end = 0;
    let endChar = 0;
    for (let index = 0; index < doc.lineCount; index++) {
        const text = doc.lineAt(index).text;
        if (text.includes(textStart)) {
            start = index;
            startChar = text.indexOf(textStart);
        } else if (start !== 0) {
            if (text.includes(textEnd)) {
                end = index;
                endChar = text.length;
                break;
            }
        }
    }
    return new vscode.Range(
        new vscode.Position(start, startChar),
        new vscode.Position(end, endChar)
    );
}
