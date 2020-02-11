import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ClientService } from '../services/ClientService';
import * as vscode from 'vscode';
import { CircularQuickInput } from '../provider/CircularQuickInputProvider';

/**
 * Executes a request with the internal graphqlclient,
 * provides user the option to insert a value for an argument
 * @param node The request that should be executed
 * @param client GraphQLClient
 */
export async function executeRequestCommand(
    node: CustomRequest,
    client: ClientService,
    channel: vscode.OutputChannel
) {
    channel.clear();
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
