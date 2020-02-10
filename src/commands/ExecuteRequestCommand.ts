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
    let vars = await quickInput.show();
    client
        .executeRequest(node.request, JSON.parse(vars))
        .then(data => {
            channel.appendLine(data);
            channel.show();
        })
        .catch(error => {
            var obj = JSON.parse(error);
            vscode.window.showErrorMessage(obj.response.errors[0].message);
        });
}
