import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import { Service } from '../provider/ServiceNodeProvider';
import {
    reactComponentTemplate,
    reactTestTemplate,
    reactFunctionTemplate,
    reactServiceTemplate,
    reactMutationServiceTemplate,
    reactQueryServiceTemplate
} from '../templates/Reacttemplate';
import { toTitleCase, getTextRange } from '../utils/Utils';
import { dirname, basename, join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import del = require('del');
import * as vscode from 'vscode';
const { promises: fs } = require('fs');
const path = require('path');
export class ReactServiceGenerator extends AbstractServiceGenerator {
    public generateService(
        serviceName: string,
        requests: CustomRequest[]
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
                try {
                    const folderPath = path.join(
                        this._folderPath,
                        '..',
                        `${serviceName}-component`
                    );
                    fs.mkdir(folderPath);

                    await this.createRequests(
                        serviceName,
                        requests,
                        folderPath
                    ).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );

                    await this.createReactService(serviceName, requests).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );

                    await this.createReactComponent(serviceName, requests).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );

                    for (const request of requests) {
                        await this.createReactTest(serviceName, request).then(
                            file => {
                                files.push(file);
                            },
                            error => reject(error)
                        );
                    }

                    // Create service tree item from requests
                    const service = new Service(
                        serviceName,
                        'React Service',
                        folderPath,
                        2,
                        'service'
                    );
                    requests.forEach(req => service.addRequest(req));
                    this._state.saveService(service);
                    await this._graphqlService.writeServiceToGraphaxJSON(
                        service
                    );
                } catch (e) {
                    throw new Error(
                        'Could not create React component ' + serviceName
                    );
                }
                resolve(files);
            }
        });
    }

    public async regenerateService(service: Service): Promise<string[]> {
        return new Promise<string[]>(async (resolve, reject) => {
            let files: string[] = new Array<string>();
            const folderPath = service.path;

            let requests: CustomRequest[] = [];
            service.requests.forEach(req => {
                this._state.myRequests.forEach(custReq => {
                    if (custReq.label === req.label) {
                        requests.push(custReq);
                    }
                });
            });

            await this.createRequests(service.label, requests, folderPath).then(
                file => {
                    files.push(file);
                }
            );

            await this.createReactService(service.label, requests).then(file =>
                files.push(file)
            );

            resolve(files);
        });
    }

    public async deleteRequestFromService(request: Service) {
        const serviceDir = dirname(request.path);
        const serviceName = basename(serviceDir).split('-')[0];
        const servicePath = join(
            serviceDir,
            `${toTitleCase(serviceName)}Service.graphax.tsx`
        );

        const componentPath = join(
            serviceDir,
            `${toTitleCase(serviceName)}Component.tsx`
        );
        const requestTestPath = join(
            serviceDir,
            `${toTitleCase(request.label)
                .split('query')
                .join('')
                .split('mutation')
                .join('')}Component.test.tsx`
        );

        if (
            existsSync(request.path) &&
            this.checkGraphaXSignature(request.path)
        ) {
            const requestDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            await this.removeRequestFromFile(requestDoc, request);
        }
        if (
            existsSync(servicePath) &&
            this.checkGraphaXSignature(servicePath)
        ) {
            const serviceDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(servicePath)
            );
            await this.removeRequestFromService(serviceDoc, request);
        }
        if (
            existsSync(componentPath) &&
            this.checkGraphaXSignature(componentPath)
        ) {
            const componentDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(componentPath)
            );
            await this.removeRequestFromComponent(componentDoc, request);
        }
        if (
            existsSync(requestTestPath) &&
            this.checkGraphaXSignature(requestTestPath)
        ) {
            unlinkSync(requestTestPath);
        }
    }

    /**
     * Remove the given request from the service document
     * @param serviceDoc The service document
     * @param request The request that should be deleted from the service
     */
    private async removeRequestFromService(
        serviceDoc: vscode.TextDocument,
        request: Service
    ) {
        let serviceName =
            toTitleCase(request.label)
                .split('query')
                .join('')
                .split('mutation')
                .join('') + 'Service';
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
            `export function ${serviceName}`,
            'export function'
        );
        if (functionRange.start.line === 0) {
            functionRange = getTextRange(
                serviceDoc,
                `export function ${serviceName}`,
                '}'
            );
            functionRange = functionRange.with(
                undefined,
                functionRange.end.with(functionRange.start.line + 7, 0)
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

    /**
     * Remove the given request from the component document
     * @param componentDoc The component document
     * @param request Request that should be deleted from the component
     */
    private async removeRequestFromComponent(
        componentDoc: vscode.TextDocument,
        request: Service
    ) {
        let serviceName =
            toTitleCase(request.label)
                .split('query')
                .join('')
                .split('mutation')
                .join('') + 'Service';
        var regex = new RegExp(serviceName);
        var pos = componentDoc.positionAt(
            componentDoc.getText().indexOf(serviceName)
        );
        let importRange = componentDoc.getWordRangeAtPosition(pos, regex);
        if (importRange) {
            importRange = new vscode.Range(
                importRange.start,
                importRange.end.with(undefined, importRange.end.character + 1)
            );
        }

        let functionRange = getTextRange(
            componentDoc,
            `export function ${toTitleCase(request.label)
                .split('query')
                .join('')
                .split('mutation')
                .join('')}`,
            'export function'
        );
        if (functionRange.start.line === 0) {
            functionRange = getTextRange(
                componentDoc,
                `export function ${toTitleCase(request.label)
                    .split('query')
                    .join('')
                    .split('mutation')
                    .join('')}`,
                '}'
            );
            functionRange = functionRange.with(
                undefined,
                functionRange.end.with(functionRange.start.line + 17, 0)
            );
        }
        functionRange = new vscode.Range(
            functionRange.start,
            functionRange.end.with(undefined, 0)
        );
        await vscode.window.showTextDocument(componentDoc).then(te => {
            te.edit(editBuilder => {
                if (importRange) {
                    editBuilder.delete(importRange);
                }
                editBuilder.delete(functionRange);
            });
        });
    }

    private async createReactService(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let imports = `import { ${requests
                .map(request => request.label)
                .join(', ')} } from './${toTitleCase(
                serviceName
            )}Requests.graphax'`;
            let functions = '';
            requests.forEach(request => {
                if (request.kindOf === 'Query') {
                    functions = functions.concat(
                        this._config.typescript
                            ? reactQueryServiceTemplate
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Service')
                                  .split('%requestInputType%')
                                  .join(
                                      request.inputType
                                          ? `args:schemaTypes.${request.inputType}`
                                          : 'any'
                                  )
                                  .split('%query%')
                                  .join('schemaTypes.Query')
                                  .split('%args%')
                                  .join(',schemaTypes.' + request.inputType)
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                            : reactQueryServiceTemplate
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Service')
                                  .split('%query%')
                                  .join('')
                                  .split('%args%')
                                  .join('')
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                    );
                } else if (request.kindOf === 'Mutation') {
                    functions = functions.concat(
                        this._config.typescript
                            ? reactMutationServiceTemplate
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Service')
                                  .split('%mutation%')
                                  .join('schemaTypes.Mutation')
                                  .split('%args%')
                                  .join(',schemaTypes' + request.inputType)
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                            : reactMutationServiceTemplate
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Service')
                                  .split('%mutation%')
                                  .join('')
                                  .split('%args%')
                                  .join('')
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                    );
                }
            });
            let content = this._config.typescript
                ? reactServiceTemplate
                      .split('%imports%')
                      .join(
                          `import * as schemaTypes from '../${this._config.generatedFolder}/schemaTypes'\n${imports}`
                      )
                      .split('%functions%')
                      .join(functions)
                : reactServiceTemplate
                      .split('%imports%')
                      .join(imports)
                      .split('%functions%')
                      .join(functions);

            let filePath = path.join(
                this._folderPath,
                '..',
                `${serviceName}-component`,
                `${toTitleCase(serviceName)}Service.graphax.tsx`
            );
            await fs.writeFile(filePath, content, 'utf-8');
            resolve(filePath);
        });
    }
    /**
     *  Async method to create a react component with given requests
     * @param serviceName Name of the service that should be created
     * @param requests requests of the service
     * @param folderPath path to service folder
     */
    private async createReactComponent(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let imports = `import { ${requests
                .map(request => toTitleCase(request.name) + 'Service')
                .join(', ')} } from './${toTitleCase(
                serviceName
            )}Service.graphax'`;
            let functions = '';
            requests.forEach(request => {
                functions = functions.concat(
                    this._config.typescript
                        ? reactFunctionTemplate
                              .split('%serviceName%')
                              .join(toTitleCase(request.name) + 'Component')
                              .split('%reactService%')
                              .join(toTitleCase(request.name) + 'Service')
                              .split('%requestInputType%')
                              .join(
                                  request.inputType
                                      ? `args:schemaTypes.${request.inputType}`
                                      : 'any'
                              )
                              .split('%request%')
                              .join(request.requestName)
                              .concat('\n')
                        : reactFunctionTemplate
                              .split('%serviceName%')
                              .join(toTitleCase(request.name) + 'Component')
                              .split('%reactService%')
                              .join(toTitleCase(request.name) + 'Service')
                              .split('%query%')
                              .join('')
                              .split('%args%')
                              .join('')
                              .split('%requestName%')
                              .join(request.label)
                              .split('%request%')
                              .join(request.requestName)
                              .concat('\n')
                );
            });
            let content = this._config.typescript
                ? reactComponentTemplate
                      .split('%imports%')
                      .join(
                          `import * as schemaTypes from '../${this._config.generatedFolder}/schemaTypes'\n${imports}`
                      )
                      .split('%functions%')
                      .join(functions)
                : reactComponentTemplate
                      .split('%imports%')
                      .join(imports)
                      .split('%functions%')
                      .join(functions);

            let filePath = path.join(
                this._folderPath,
                '..',
                `${serviceName}-component`,
                `${toTitleCase(serviceName)}Component.tsx`
            );
            await fs.writeFile(filePath, content, 'utf-8');
            resolve(filePath);
        });
    }

    private async createReactTest(serviceName: string, request: CustomRequest) {
        return new Promise<string>(async (resolve, reject) => {
            let imports = `import { ${request.label} } from './${toTitleCase(
                serviceName
            )}Requests.graphax'`;
            let mockData = await this.getMockingData(request);
            let content = '';
            content = reactTestTemplate
                .split('%imports%')
                .join(
                    `import { ${toTitleCase(
                        request.name
                    )}Component} from './${toTitleCase(
                        serviceName
                    )}Component'\n${imports}`
                )
                .split('%mockingData%')
                .join(JSON.stringify(JSON.parse(mockData)))
                .split('%request%')
                .join(request.kindOf.toLowerCase())
                .split('%requestName%')
                .join(request.label)
                .split('%requestType%')
                .join(request.type)
                .split('%componentName%')
                .join(toTitleCase(request.name) + 'Component');
            let filePath = path.join(
                this._folderPath,
                '..',
                `${serviceName}-component`,
                `${toTitleCase(request.name)}Component.test.tsx`
            );
            await fs.writeFile(filePath, content, 'utf-8');
            resolve(filePath);
        });
    }
}
