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
        this._config.headers.forEach(obj => {
            for(let [key,value] of Object.entries(obj)){
                this._graphQLClient.setHeader(key,value);
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
            for(let [key,value] of Object.entries(obj)){
                this._graphQLClient.setHeader(key,value);
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
                requestPromise = Promise.reject(
                    JSON.stringify(error, undefined, 2)
                );
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
