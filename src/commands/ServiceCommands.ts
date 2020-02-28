import { ServiceNode } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { GraphQLService } from '../services/GraphQLService';
import { Framework } from '../services/ConfigurationService';
import { join, basename, dirname } from 'path';
import { sleep } from '../utils/Utils';
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
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Create service',
            cancellable: true
        },
        async (progress, token) => {
            token.onCancellationRequested(() => {
                vscode.window.showInformationMessage(
                    'Cancelled request creation!'
                );
            });
            progress.report({
                increment: 33,
                message: 'Please provide a unique name for your service!'
            });
            let done = false;
            while (!done) {
                await vscode.window
                    .showInputBox({
                        prompt: 'Please provide a name for your service',
                        validateInput: text => {
                            return text !== undefined &&
                                text.match(/^[a-zA-Z]+[a-zA-Z0-9]*[a-zA-Z]+$/)
                                ? null
                                : 'Please provide a name for your service';
                        }
                    })
                    .then(async value => {
                        if (value !== undefined) {
                            await service.createService(value, requests).then(
                                async files => {
                                    progress.report({
                                        increment: 66,
                                        message: 'Creating service...'
                                    });

                                    // ! TODO: Provide way to show created files and correctly implementation
                                    files.forEach(file => {
                                        vscode.workspace
                                            .openTextDocument(
                                                vscode.Uri.file(file)
                                            )
                                            .then(doc =>
                                                vscode.window.showTextDocument(
                                                    doc
                                                )
                                            );
                                    });
                                    progress.report({
                                        increment: 100,
                                        message: 'Finished creating service!'
                                    });
                                    await sleep(1000);
                                    done = true;
                                },
                                () => {
                                    progress.report({
                                        increment: 33,
                                        message: `Service ${value} already exists! Please provide a unique name!`
                                    });
                                }
                            );
                        } else {
                            done = true;
                            vscode.window.showInformationMessage(
                                'Cancelled request creation!'
                            );
                        }
                    });
            }
        }
    );
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
    service: ServiceNode,
    request: ServiceNode,
    framework: Framework
) {
    switch (+framework) {
        case Framework.ANGULAR:
            const serviceDir = dirname(request.path);
            var serviceName = basename(serviceDir).split('-')[0];
            const requestDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            const serviceDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(join(serviceDir, `${serviceName}.service.ts`))
            );
            const componentDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(join(serviceDir, `${serviceName}.component.ts`))
            );

            await removeRequestFromFile(requestDoc, request);
            await removeFromService(serviceDoc, request);
            await removeFromComponent(componentDoc, request);
            break;
        case Framework.NONE:
            const doc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            removeRequestFromFile(doc, request);
            break;
    }
}

/**
 * Async fucntion to delete a request from a RequestFile
 * @param doc Document in which the request is written
 * @param request Request that should be deleted
 */
async function removeRequestFromFile(
    doc: vscode.TextDocument,
    request: ServiceNode
) {
    let range = getTextRange(doc, `export const ${request.label}`, '`;');
    await vscode.window.showTextDocument(doc).then(te => {
        te.edit(editBuilder => {
            editBuilder.replace(range, '');
        });
    });
}

/**
 * Removes a request from a service
 * @param doc Servicedocument
 * @param request Request which should be removed
 */
async function removeFromService(
    doc: vscode.TextDocument,
    request: ServiceNode
) {
    var regex = new RegExp(request.label);
    var pos = doc.positionAt(doc.getText().indexOf(request.label));
    let importRange = doc.getWordRangeAtPosition(pos, regex);
    let range: vscode.Range;
    let fullrange = getTextRange(doc, `${request.label}(args`, '(args');
    if (fullrange.start.line === 0) {
        fullrange = getTextRange(doc, `${request.label}(args`, '}');
    }
    range = new vscode.Range(fullrange.start, fullrange.end.with(undefined, 0));
    await vscode.window.showTextDocument(doc).then(te => {
        te.edit(editBuilder => {
            editBuilder.replace(range, '');
            if (importRange !== undefined) {
                editBuilder.delete(importRange);
            }
        });
    });
}

/**
 * Async fucntion to remove a request from a component
 * @param doc Component document
 * @param request Request which should be removed
 */
async function removeFromComponent(
    doc: vscode.TextDocument,
    request: ServiceNode
) {
    let propRange: vscode.Range;
    for (let index = 0; index < doc.lineCount; index++) {
        const text = doc.lineAt(index).text;
        if (
            text.includes(
                request.label.split('Query')[0].split('Mutation')[0] + ':'
            )
        ) {
            propRange = doc.lineAt(index).rangeIncludingLineBreak;
            break;
        }
    }
    let serviceRange: vscode.Range;
    let fullRange: vscode.Range = getTextRange(
        doc,
        `this.service.${request.label}(`,
        `this.service.`
    );
    if (fullRange.start.line === 0) {
        serviceRange = getTextRange(doc, `this.service.${request.label}(`, '}');
    } else {
        serviceRange = new vscode.Range(
            fullRange.start,
            fullRange.end.with(undefined, 0)
        );
    }

    await vscode.window.showTextDocument(doc).then(te => {
        te.edit(editBuilder => {
            editBuilder.delete(propRange);
            editBuilder.delete(serviceRange);
        });
    });
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
