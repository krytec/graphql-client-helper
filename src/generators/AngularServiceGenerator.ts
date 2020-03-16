import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import {
    angularServiceTemplate,
    angularComponentTemplate,
    angularTestTemplate,
    angularTestRequestTemplate
} from '../templates/AngularTemplate';
import { toTitleCase, getTextRange } from '../utils/Utils';
import { Service } from '../provider/ServiceNodeProvider';
import { dirname, basename, join } from 'path';
const { promises: fs } = require('fs');
const path = require('path');
import * as vscode from 'vscode';
import { existsSync } from 'fs';
export class AngularServiceGenerator extends AbstractServiceGenerator {
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
                try {
                    const folderPath = path.join(
                        this._folderPath,
                        '..',
                        'app',
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
                    await this.createAngularService(serviceName, requests).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );
                    await this.createAngularComponent(
                        serviceName,
                        requests
                    ).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );
                    await this.createAngularTests(serviceName, requests).then(
                        file => {
                            files.push(file);
                        },
                        error => reject(error)
                    );

                    // Create service tree item from requests
                    const service = new Service(
                        serviceName,
                        'Angular Service',
                        folderPath,
                        2,
                        'service'
                    );
                    requests.forEach(req => service.addRequest(req));
                    this._state.saveService(service);
                } catch (e) {
                    throw new Error(
                        'Could not create Angular component ' + serviceName
                    );
                }
                resolve(files);
            }
        });
    }

    /**
     * Method to delete a request from the service
     * @param request The request that should be deleted from the service
     */
    public async deleteRequestFromService(request: Service) {
        const serviceDir = dirname(request.path);
        const serviceName = basename(serviceDir).split('-')[0];
        const servicePath = join(serviceDir, `${serviceName}.service.ts`);
        const componentPath = join(serviceDir, `${serviceName}.component.ts`);
        const testPath = join(serviceDir, `${serviceName}.spec.ts`);
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
            await this.removeFromService(serviceDoc, request);
        }
        if (
            existsSync(componentPath) &&
            this.checkGraphaXSignature(componentPath)
        ) {
            const componentDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(componentPath)
            );
            await this.removeFromComponent(componentDoc, request);
        }
        if (existsSync(testPath) && this.checkGraphaXSignature(testPath)) {
            const testDoc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(testPath)
            );
            await this.removeFromTest(testDoc, request);
        }
    }

    /**
     * * Method to create a angular service for the given requests
     * @param serviceName Name of the service
     * @param requests
     */
    private async createAngularService(
        serviceName: string,
        requests: CustomRequest[]
    ) {
        let content: string = angularServiceTemplate;
        let imports = `import { ${requests
            .map(request => request.label)
            .join(', ')} } from './${toTitleCase(serviceName)}Requests'`;
        let functions = '';
        requests.forEach(request => {
            functions = functions.concat(
                `${request.label}(args: schemaTypes.${request.inputType}){
    return this.apollo.${request.kindOf.toLowerCase()}
        <schemaTypes.${request.kindOf}>({
        ${request.kindOf.toLowerCase()}: ${request.label},
        variables: args,
    });
}
`
            );
        });
        content = content
            .split('%folderName%')
            .join(this._config.generatedFolder)
            .split('%myImports%')
            .join(imports)
            .split('%serviceName%')
            .join(toTitleCase(serviceName) + 'Service')
            .split('%myFunctions%')
            .join(functions);
        let filePath = path.join(
            this._folderPath,
            '..',
            'app',
            `${serviceName}-component`,
            `${serviceName}.service.ts`
        );
        await fs.writeFile(filePath, content, 'utf-8');
        return Promise.resolve(filePath);
    }

    /**
     * * Method to create a angular component for the given requests
     * @param componentName Name of the component
     * @param requests
     */
    private async createAngularComponent(
        componentName: string,
        requests: CustomRequest[]
    ) {
        let variables = requests
            .map(request => {
                const returnslist = this._state.requests.map(gql => {
                    if (request.requestName === gql.Name) {
                        return gql.returnsList;
                    }
                });
                if (returnslist.includes(true)) {
                    return `${request.name}: schemaTypes.${request.type}[];`;
                } else {
                    return `${request.name}: schemaTypes.${request.type};`;
                }
            })
            .join('\n');

        let functions = requests
            .map(request => {
                return `
    this.service.${request.label}(null).subscribe(({data}) => {
        this.${request.name} = data.${request.requestName};
    });
`;
            })
            .join('');
        let content = angularComponentTemplate
            .split('%folderName%')
            .join(this._config.generatedFolder)
            .split('%myNameTitel%')
            .join(toTitleCase(componentName))
            .split('%myServiceTitel%')
            .join(toTitleCase(componentName) + 'Service')
            .split('%myName%')
            .join(componentName)
            .split('%myService%')
            .join(componentName + 'Service')
            .split('%myFunctions%')
            .join(functions)
            .split('%myVariables%')
            .join(variables);
        let filePath = path.join(
            this._folderPath,
            '..',
            'app',
            `${componentName}-component`,
            `${componentName}.component.ts`
        );
        await fs.writeFile(filePath, content, 'utf-8');
        return Promise.resolve(filePath);
    }

    /**
     * Async method to generate code for service tests
     * @param serviceName name of the service that should be tested
     * @param requests requests that should be tested
     */
    private async createAngularTests(
        serviceName: string,
        requests: CustomRequest[]
    ) {
        let imports = `import { ${requests
            .map(request => request.label)
            .join(', ')} } from './${toTitleCase(serviceName)}Requests'`;
        let test_data = '';
        let test_requests = '';
        let tests: string = '';
        for (const request of requests) {
            await this.getMockingData(request).then(mockData => {
                test_data = test_data.concat(`
const test_${request.label}data: schemaTypes.${request.type} ${
                    request.returnsList ? '[]' : ''
                } = 
                    ${JSON.stringify(JSON.parse(mockData))};

`);
                test_requests = test_requests.concat(`
const test_${request.label} = {
    "data":{
        "${request.requestName}": ${`test_${request.label}data`},
    }
};
                `);
            });
            var requestTest = angularTestRequestTemplate
                .split('%request%')
                .join(request.label)
                .split('%serviceNameToLowerCase%')
                .join(serviceName.toLowerCase() + 'Service')
                .split('%returnType%')
                .join(request.requestName)
                .split('%test_dataName%')
                .join(`test_${request.label}data`)
                .split('%test_requestName%')
                .join(`test_${request.label}`);
            tests = tests.concat(requestTest);
        }
        let content = angularTestTemplate
            .split('%folderName%')
            .join(this._config.generatedFolder)
            .split('%imports%')
            .join(imports)
            .split('%service%')
            .join(serviceName)
            .split('%serviceNameToLowerCase%')
            .join(serviceName.toLowerCase() + 'Service')
            .split('%serviceName%')
            .join(toTitleCase(serviceName) + 'Service')
            .split('%test_data%')
            .join(test_data)
            .split('%test_requests%')
            .join(test_requests)
            .replace(/%request_test%/, tests);
        let filePath = path.join(
            this._folderPath,
            '..',
            'app',
            `${serviceName}-component`,
            `${serviceName}.spec.ts`
        );
        await fs.writeFile(filePath, content, 'utf-8');
        return Promise.resolve(filePath);
    }

    /**
     * Removes a request from a service
     * @param doc Servicedocument
     * @param request Request which should be removed
     */
    private async removeFromService(
        doc: vscode.TextDocument,
        request: Service
    ) {
        var regex = new RegExp(request.label);
        var pos = doc.positionAt(doc.getText().indexOf(request.label));
        let importRange = doc.getWordRangeAtPosition(pos, regex);
        let range: vscode.Range;
        let fullrange = getTextRange(doc, `${request.label}(args`, '(args');
        if (fullrange.start.line === 0) {
            fullrange = getTextRange(doc, `${request.label}(args`, '}');
        }
        range = new vscode.Range(
            fullrange.start,
            fullrange.end.with(fullrange.end.line + 2, 0)
        );
        await vscode.window.showTextDocument(doc).then(te => {
            te.edit(editBuilder => {
                editBuilder.delete(range);
                if (importRange !== undefined) {
                    editBuilder.delete(importRange);
                }
            });
        });
    }

    /**
     * Async fucntion to remove a request from a component
     * @param doc Component document
     * @param request Request which should be removed
     */
    private async removeFromComponent(
        doc: vscode.TextDocument,
        request: Service
    ) {
        let propRange: vscode.Range;
        for (let index = 0; index < doc.lineCount; index++) {
            const text = doc.lineAt(index).text;
            if (
                text.includes(
                    request.label.split('Query')[0].split('Mutation')[0] + ':'
                )
            ) {
                propRange = doc.lineAt(index).rangeIncludingLineBreak;
                break;
            }
        }
        let serviceRange: vscode.Range;
        let fullRange: vscode.Range = getTextRange(
            doc,
            `this.service.${request.label}(`,
            `this.service.`
        );
        if (fullRange.start.line === 0) {
            serviceRange = getTextRange(
                doc,
                `this.service.${request.label}(`,
                '}'
            );
        } else {
            serviceRange = new vscode.Range(
                fullRange.start,
                fullRange.end.with(undefined, 0)
            );
        }

        await vscode.window.showTextDocument(doc).then(te => {
            te.edit(editBuilder => {
                editBuilder.delete(propRange);
                editBuilder.delete(serviceRange);
            });
        });
    }

    /**
     * Method to remove a request from the test file
     * @param doc Test document
     * @param request Request that should be removed from the test
     */
    private async removeFromTest(doc: vscode.TextDocument, request: Service) {
        var regex = new RegExp(request.label);
        var pos = doc.positionAt(doc.getText().indexOf(request.label));
        let importRange = doc.getWordRangeAtPosition(pos, regex);
        if (importRange) {
            importRange = new vscode.Range(
                importRange.start,
                importRange.end.with(undefined, importRange.end.character + 1)
            );
        }
        let testDataRange = getTextRange(
            doc,
            `const test_${request.label}data`,
            ''
        );
        let testRange = getTextRange(
            doc,
            `const test_${request.label} =`,
            '};'
        );
        let itRange = getTextRange(
            doc,
            `it("should test ${request.label}`,
            `});`
        );
        itRange = new vscode.Range(
            itRange.start,
            itRange.end.with(itRange.end.line + 2, undefined)
        );
        await vscode.window.showTextDocument(doc).then(te => {
            te.edit(editBuilder => {
                if (importRange) {
                    editBuilder.delete(importRange);
                }
                editBuilder.delete(testDataRange);
                editBuilder.delete(testRange);
                editBuilder.delete(itRange);
            });
        });
    }
}
