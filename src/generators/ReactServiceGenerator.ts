import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ServiceNode } from '../provider/ServiceNodeProvider';
import {
    reactQueryFunction,
    reactMutationFunction,
    reactComponent,
    reactTest
} from '../templates/Reacttemplate';
import { toTitleCase } from '../utils/Utils';
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
                    const service = new ServiceNode(
                        serviceName,
                        'React Service',
                        folderPath,
                        2,
                        'service'
                    );
                    requests.forEach(req => service.addRequest(req));
                    this._state.saveService(service);
                } catch (e) {
                    throw new Error(
                        'Could not create React component ' + serviceName
                    );
                }
                resolve(files);
            }
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
            let requestsAsString = '';
            let functions = '';
            requests.forEach(request => {
                requestsAsString = requestsAsString.concat(
                    `export const ${request.label} = gql\`${request.request}\`;\n`
                );
                if (request.kindOf === 'Query') {
                    functions = functions.concat(
                        this._config.typescript
                            ? reactQueryFunction
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Component')
                                  .split('%query%')
                                  .join('schemaTypes.Query')
                                  .split('%args%')
                                  .join(',schemaTypes.' + request.inputType)
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                            : reactQueryFunction
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Component')
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
                            ? reactMutationFunction
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Component')
                                  .split('%mutation%')
                                  .join('schemaTypes.Mutation')
                                  .split('%args%')
                                  .join(',schemaTypes' + request.inputType)
                                  .split('%requestName%')
                                  .join(request.label)
                                  .split('%request%')
                                  .join(request.requestName)
                                  .concat('\n')
                            : reactMutationFunction
                                  .split('%serviceName%')
                                  .join(toTitleCase(request.name) + 'Component')
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
                ? reactComponent
                      .split('%imports%')
                      .join(
                          `import * as schemaTypes from '../${this._config.generatedFolder}/schemaTypes'`
                      )
                      .split('%requests%')
                      .join(requestsAsString)
                      .split('%functions%')
                      .join(functions)
                : reactComponent
                      .split('%imports%')
                      .join(``)
                      .split('%requests%')
                      .join(requestsAsString)
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
            let mockData = await this.getMockingData(request);
            let content = '';
            content = reactTest
                .split('%imports%')
                .join(
                    `import { ${toTitleCase(request.name)}Component, ${
                        request.label
                    } } from './${toTitleCase(serviceName)}Component'`
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
