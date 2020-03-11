import { commands, window, workspace, Uri } from 'vscode';
import * as vscode from 'vscode';
import { isValidURL } from '../utils/Utils';
import { join } from 'path';
import { GraphQLService } from '../services/GraphQLService';
import { ConfigurationService } from '../services/ConfigurationService';

// Runs an introspection query on given endpoint and creates a schema file
export async function createSchema(
    service: GraphQLService,
    config: ConfigurationService
) {
    return new Promise(async (resolve, reject) => {
        let result = await window
            .showInputBox({
                placeHolder: 'For example https://graphql-pokemon.now.sh/',
                validateInput: text => {
                    return isValidURL(text)
                        ? null
                        : 'Invalid URL: Has to start with http or https';
                }
            })
            .then(value => {
                if (value !== undefined) {
                    if (workspace.workspaceFolders !== undefined) {
                        let pathToFolder =
                            workspace.workspaceFolders[0].uri.fsPath;
                        service.folder = pathToFolder;
                        let schema = service
                            .getSchemaFromEndpoint(value)
                            .catch(error =>
                                window.showErrorMessage(
                                    'Error creating Schema:' + error
                                )
                            )
                            .then(() => {
                                config.endpoint = value;
                                var openPath = Uri.file(
                                    join(service.folder, 'schema.gql')
                                );
                                workspace
                                    .openTextDocument(openPath)
                                    .then(doc => window.showTextDocument(doc));
                                resolve();
                            });
                    } else {
                        window.showErrorMessage('No workspace opened!');
                        reject();
                    }
                } else {
                    window.showErrorMessage('Invalid path provided!');
                    reject();
                }
            });
    });
}
