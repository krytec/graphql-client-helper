import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { Service } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import {
    serviceTemplate,
    serviceFunctionTemplate
} from '../templates/ServiceTemplate';
import { toTitleCase, getTextRange } from '../utils/Utils';
import request from 'graphql-request';
import { join, dirname, basename } from 'path';
const { promises: fs } = require('fs');
const path = require('path');
export class ServiceGenerator extends AbstractServiceGenerator {
    public generateService(
        serviceName: string,
        requests: import('../provider/CustomRequestNodeProvider').CustomRequest[]
    ): Promise<string[]> {
        return new Promise<string[]>(async (resolve, reject) => {
            let files: string[] = new Array<string>();
            let alreadyUsed = false;
            this._state.services.forEach(service => {
                if (service.label === serviceName) {
                    alreadyUsed = true;
                    reject();
                }
            });
            if (!alreadyUsed) {
                const folderPath = path.join(
                    this._folderPath,
                    '..',
                    `${serviceName}-service`
                );
                try {
                    fs.mkdir(folderPath);
                } catch (err) {
                    reject(
                        new Error(
                            'Could not create ' + serviceName + ' service'
                        )
                    );
                }
                await this.createRequests(
                    serviceName,
                    requests,
                    folderPath
                ).then(file => {
                    files.push(file);
                });

                await this.createServiceComponent(
                    serviceName,
                    requests
                ).then(file => files.push(file));

                // Create service tree item from requests
                const service = new Service(
                    serviceName,
                    'Service',
                    folderPath,
                    2,
                    'service'
                );
                requests.forEach(req => service.addRequest(req));
                this._state.saveService(service);
                await this._graphqlService.writeServiceToGraphaxJSON(service);
                resolve(files);
            }
        });
    }

    /**
     * Private method to create a service component for non specific framework
     * @param serviceName Name of the service that should be created
     * @param requests requests which should be provided as functions
     */
    private async createServiceComponent(
        serviceName: string,
        requests: CustomRequest[]
    ) {
        let imports = `import { ${requests
            .map(request => request.label)
            .join(', ')} } from './${toTitleCase(serviceName)}Requests'
            import * as schemaTypes from '../${
                this._config.generatedFolder
            }/schemaTypes'`;

        let functions = requests
            .map(request => {
                return serviceFunctionTemplate
                    .split('%functionName%')
                    .join(toTitleCase(request.label))
                    .split('%inputType%')
                    .join(request.inputType)
                    .split('%functionType%')
                    .join(request.kindOf === 'Query' ? 'query' : 'mutate')
                    .split('%requestType%')
                    .join(request.kindOf)
                    .split('%request%')
                    .join(request.label)
                    .split('%returnType%')
                    .join(request.requestName);
            })
            .join('\n');

        let content = serviceTemplate
            .split('%imports%')
            .join(imports)
            .split('%serviceNameToTitleCase%')
            .join(toTitleCase(serviceName))
            .split('%functions%')
            .join(functions);

        let filePath = path.join(
            this._folderPath,
            '..',
            `${serviceName}-service`,
            `${serviceName}.service.ts`
        );
        await fs.writeFile(filePath, content, 'utf-8');
        return Promise.resolve(filePath);
    }

    /**
     * Method to delete a request from a service
     * @param request The request that should be deleted from the service
     */
    public async deleteRequestFromService(request: Service) {
        const serviceDir = dirname(request.path);
        const serviceName = basename(serviceDir).split('-')[0];
        const componentPath = join(serviceDir, `${serviceName}.service.ts`);
        if (
            existsSync(request.path) &&
            this.checkGraphaXSignature(request.path)
        ) {
            const doc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            await this.removeRequestFromFile(doc, request);
        }
        if (
            existsSync(componentPath) &&
            this.checkGraphaXSignature(componentPath)
        ) {
            const serviceDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(componentPath)
            );
            await this.removeRequestFromService(serviceDoc, request);
        }
    }

    private async removeRequestFromService(
        serviceDoc: vscode.TextDocument,
        request: Service
    ) {
        var regex = new RegExp(request.label);
        var pos = serviceDoc.positionAt(
            serviceDoc.getText().indexOf(request.label)
        );
        let importRange = serviceDoc.getWordRangeAtPosition(pos, regex);
        if (importRange) {
            importRange = new vscode.Range(
                importRange.start,
                importRange.end.with(undefined, importRange.end.character + 1)
            );
        }

        let functionRange = getTextRange(
            serviceDoc,
            `public async get${request.label}(`,
            'public async'
        );
        if (functionRange.start.line === 0) {
            functionRange = getTextRange(
                serviceDoc,
                `public async get${request.label}(`,
                '}'
            );
            functionRange = functionRange.with(
                undefined,
                functionRange.end.with(functionRange.start.line + 15, 0)
            );
        }
        functionRange = new vscode.Range(
            functionRange.start,
            functionRange.end.with(undefined, 0)
        );
        await vscode.window.showTextDocument(serviceDoc).then(te => {
            te.edit(editBuilder => {
                if (importRange) {
                    editBuilder.delete(importRange);
                }
                editBuilder.delete(functionRange);
            });
        });
    }
}
