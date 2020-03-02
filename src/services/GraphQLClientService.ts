import * as vscode from 'vscode';
import { ConfigurationService } from './ConfigurationService';
import { GraphQLClient } from 'graphql-request';

export class GraphQLClientService {
    private _graphQLClient: GraphQLClient;
    private _onDidExecuteRequest: vscode.EventEmitter<
        number
    > = new vscode.EventEmitter<number>();
    public readonly onDidExecuteRequest: vscode.Event<number> = this
        ._onDidExecuteRequest.event;

    constructor(private _config: ConfigurationService) {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
        this._config.headers.forEach(obj => {
            for (let [key, value] of Object.entries(obj)) {
                this._graphQLClient.setHeader(key, value);
            }
        });
        this._config.onDidChangeEndpoint(e => this.reload());
        this._config.onDidChangeHeaders(e => {
            this.reload();
        });
    }

    /**
     * Method to reload the graphqlclient with a new endpoint
     */
    private reload() {
        this._graphQLClient = new GraphQLClient(this._config.endpoint);
        this._config.headers.forEach(obj => {
            for (let [key, value] of Object.entries(obj)) {
                this._graphQLClient.setHeader(key, value);
            }
        });
    }

    /**
     * Method to execute a given request and shows output in an unsaved file
     * @param request Request as string
     * @param args Arguments as json object
     */
    async executeRequest(request: string, args): Promise<string> {
        var start = performance.now();
        var end;
        let requestPromise: Promise<string> | undefined;
        await this._graphQLClient
            .request(request, args)
            .then(data => {
                requestPromise = Promise.resolve(
                    JSON.stringify(data, undefined, 2)
                );
            })
            .catch(error => {
                requestPromise = Promise.reject(error);
            })
            .finally(() => {
                end = performance.now();
                this._onDidExecuteRequest.fire(end - start);
            });
        if (requestPromise !== undefined) {
            return requestPromise;
        } else {
            throw new Error('Graphax Client failed to run request');
        }
    }
}
