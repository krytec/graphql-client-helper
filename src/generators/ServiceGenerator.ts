import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { Service } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import {
    serviceTemplate,
    serviceFunctionTemplate
} from '../templates/ServiceTemplate';
import { toTitleCase } from '../utils/Utils';
import request from 'graphql-request';
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
            .join(', ')} } from './${serviceName}Requests'
            import * as schemaTypes from '../${
                this._config.generatedFolder
            }/schemaTypes'`;

        let functions = requests
            .map(request => {
                return serviceFunctionTemplate
                    .split('%functionName%')
                    .join(request.label)
                    .split('%inputType%')
                    .join(request.inputType)
                    .split('%functionType%')
                    .join(request.kindOf === 'query' ? 'query' : 'mutate')
                    .split('%requestType%')
                    .join(request.kindOf)
                    .split('%request%')
                    .join(request.label)
                    .split('%returnType%')
                    .join(request.type.toLowerCase());
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
        if (existsSync(request.path)) {
            const doc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            this.removeRequestFromFile(doc, request);
        }
    }
}
