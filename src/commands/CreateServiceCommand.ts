import { StateService } from '../services/StateService';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import GraphQLService from '../services/GraphQLService';
import * as vscode from 'vscode';

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
                service.createService(value, requests);
            }
        });
}
