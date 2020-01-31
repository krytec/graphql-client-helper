import { StateService } from './StateService';
import { request, GraphQLClient } from 'graphql-request';
import { ConfigurationService } from './ConfigurationService';
import * as vscode from 'vscode';
import { join } from 'path';
/**
 * Service class which handles the internal graphql client
 */
export class ClientService {
    private _graphQLClient: GraphQLClient;
    constructor(
        private _state: StateService,
        private _config: ConfigurationService
    ) {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
    }

    reload() {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
    }

    async executeRequest(request: string, args) {
        const data = await this._graphQLClient.request(request, args);
        console.log(JSON.stringify(data, undefined, 2));
        var curWorkspace =
            vscode.workspace.workspaceFolders !== undefined
                ? vscode.workspace.workspaceFolders[0].uri.fsPath
                : '.';
        const newFile = vscode.Uri.parse(
            'untitled:' + join(curWorkspace, 'Result.json')
        );
        vscode.workspace.openTextDocument(newFile).then(document => {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(
                newFile,
                new vscode.Position(0, 0),
                JSON.stringify(data, undefined, 2)
            );
            return vscode.workspace.applyEdit(edit).then(success => {
                if (success) {
                    vscode.window.showTextDocument(document);
                } else {
                    vscode.window.showInformationMessage('Error!');
                }
            });
        });
    }
}
