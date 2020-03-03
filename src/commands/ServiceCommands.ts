import { ServiceNode } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { GraphQLService } from '../services/GraphQLService';
import { Framework } from '../services/ConfigurationService';
import { join, basename, dirname } from 'path';
import { sleep, getTextRange } from '../utils/Utils';
import { AbstractServiceGenerator } from '../generators/AbstractServiceGenerator';
import { LoggingService } from '../services/LoggingService';
/**
 * Provides a CreateServiceCommand which executes the createService
 * method of the GraphQLService
 * @param service GraphQLService
 * @param requests Selected request
 */
export async function showCreateServiceCommand(
    logger: LoggingService,
    generator: AbstractServiceGenerator,
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
                            await generator
                                .generateService(value, requests)
                                .then(
                                    async files => {
                                        progress.report({
                                            increment: 66,
                                            message: 'Creating service...'
                                        });
                                        files.forEach(file =>
                                            logger.logDebug('Created ' + file)
                                        );

                                        progress.report({
                                            increment: 100,
                                            message:
                                                'Finished creating service!'
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
