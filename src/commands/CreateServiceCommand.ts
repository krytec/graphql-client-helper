import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import GraphQLService from '../services/GraphQLService';
import * as vscode from 'vscode';

/**
 * Provides a CreateServiceCommand which executes the createService
 * method of the GraphQLService
 * @param service GraphQLService
 * @param requests Selected request
 */
export function showCreateServiceCommand(
    service: GraphQLService,
    requests: CustomRequest[]
) {
    vscode.window
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
                // ? need to think about that...
                service.createService(value, requests).then(files => {
                    // vscode.workspace
                    //     .openTextDocument(vscode.Uri.file(files[0]))
                    //     .then(doc => vscode.window.showTextDocument(doc));
                });
            }
        });
}
