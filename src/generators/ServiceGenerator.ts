import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { ServiceNode } from '../provider/ServiceNodeProvider';
import * as vscode from 'vscode';
import { existsSync } from 'fs';
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
                    await this.createRequests(
                        serviceName,
                        requests,
                        folderPath
                    ).then(file => {
                        files.push(file);
                    });
                    // Create service tree item from requests
                    const service = new ServiceNode(
                        serviceName,
                        'Service',
                        folderPath,
                        2,
                        'service'
                    );
                    requests.forEach(req => service.addRequest(req));
                    this._state.saveService(service);
                } catch (error) {
                    reject(
                        new Error('Could not create service ' + serviceName)
                    );
                }
                resolve(files);
            }
        });
    }

    /**
     * Method to delete a request from a service
     * @param request The request that should be deleted from the service
     */
    public async deleteRequestFromService(request: ServiceNode) {
        if (existsSync(request.path)) {
            const doc = await vscode.workspace.openTextDocument(
                vscode.Uri.file(request.path)
            );
            this.removeRequestFromFile(doc, request);
        }
    }
}
