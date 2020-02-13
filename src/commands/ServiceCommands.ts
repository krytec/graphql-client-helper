import { ServiceNode } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { GraphQLService } from '../services/GraphQLService';
import { Framework } from '../services/ConfigurationService';
import * as fs from 'fs';
import request from 'graphql-request';
import { join } from 'path';
import { createRequestFromCode, getRequestFromString } from './RequestCommands';
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

export function addServiceCommand(
    state: StateService,
    graphqlService: GraphQLService,
    fsPath: string
) {
    let dir = fs.readdirSync(fsPath);
    dir.forEach(async file => {
        const filePath = join(fsPath, file);
        if (fs.statSync(filePath).isFile()) {
            var doc = await vscode.workspace.openTextDocument(filePath);
            var idx = 0;
            var end = 0;
            while (doc.getText().includes('gql`', end + 1)) {
                idx = doc.getText().indexOf('gql`', end);
                end = doc.getText().indexOf('`;', idx);
                var request = doc.getText().slice(idx + 4, end);
                console.log(request);
                getRequestFromString(state, graphqlService, request);
            }
        }
    });
}

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
