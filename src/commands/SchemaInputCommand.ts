import { commands, window, workspace, Uri } from 'vscode';
import * as vscode from 'vscode';
import GraphQLUtils from '../services/GraphQLService';
import { isValidURL } from '../utils/Utils';
import { join } from 'path';
import GraphQLService from '../services/GraphQLService';

// Runs an introspection query on given endpoint and creates a schema file
export async function showCreateSchemaInput(service: GraphQLService) {
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
                    let pathToFolder = workspace.workspaceFolders[0];
                    service.folder = pathToFolder.uri.fsPath;
                    let schema = service
                        .getSchemaFromEndpoint(value)
                        .catch(error =>
                            window.showErrorMessage(
                                'Error creating Schema:' + error
                            )
                        )
                        .then(() => {
                            var openPath = Uri.file(
                                join(
                                    pathToFolder.uri.fsPath,
                                    'graphqlschema',
                                    'schema.gql'
                                )
                            );
                            workspace
                                .openTextDocument(openPath)
                                .then(doc => window.showTextDocument(doc));
                        });
                } else {
                    window.showErrorMessage('No workspace opened!');
                }
            } else {
                window.showErrorMessage('Invalid path provided!');
            }
        });
}
