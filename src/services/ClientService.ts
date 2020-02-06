import { StateService } from './StateService';
import { request, GraphQLClient } from 'graphql-request';
import { ConfigurationService } from './ConfigurationService';
import * as vscode from 'vscode';
import { join } from 'path';
import { performance } from 'perf_hooks';

/**
 * Service class which handles the internal graphql client
 */
export class ClientService {
    private _graphQLClient: GraphQLClient;
    private outputChannel = vscode.window.createOutputChannel('Graphax Client');
    private _onDidExecuteRequest: vscode.EventEmitter<
        number
    > = new vscode.EventEmitter<number>();
    public readonly onDidExecuteRequest: vscode.Event<number> = this
        ._onDidExecuteRequest.event;

    constructor(
        private _state: StateService,
        private _config: ConfigurationService
    ) {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
        this._config.onDidChangeEndpoint(e => this.reload());
    }

    /**
     * Method to reload the graphqlclient with a new endpoint
     */
    private reload() {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
    }

    /**
     * Method to execute a given request and shows output in an unsaved file
     * @param request Request as string
     * @param args Arguments as json object
     */
    async executeRequest(request: string, args) {
        this.outputChannel.clear();
        var start = performance.now();
        var end;
        this._graphQLClient
            .request(request, args)
            .then(data =>
                this.outputChannel.appendLine(
                    JSON.stringify(data, undefined, 2)
                )
            )
            .catch(error =>
                this.outputChannel.appendLine(
                    JSON.stringify(error, undefined, 2)
                )
            )
            .finally(() => {
                end = performance.now();
                this.outputChannel.show();
                this._onDidExecuteRequest.fire(end - start);
            });

        // var curWorkspace =
        //     vscode.workspace.workspaceFolders !== undefined
        //         ? vscode.workspace.workspaceFolders[0].uri.fsPath
        //         : '.';
        // const newFile = vscode.Uri.parse(
        //     'untitled:' + join(curWorkspace, 'Result.json')
        // );
        // vscode.workspace.openTextDocument(newFile).then(document => {
        //     const edit = new vscode.WorkspaceEdit();
        //     edit.insert(
        //         newFile,
        //         new vscode.Position(0, 0),
        //         JSON.stringify(data, undefined, 2)
        //     );
        //     return vscode.workspace.applyEdit(edit).then(success => {
        //         if (success) {
        //             vscode.window.showTextDocument(document);
        //         } else {
        //             vscode.window.showInformationMessage('Error!');
        //         }
        //     });
        // });
    }
}
