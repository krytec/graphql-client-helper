import { AbstractServiceGenerator } from './AbstractServiceGenerator';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import {
    angularServiceTemplate,
    angularComponentTemplate,
    angularTestTemplate,
    angularTestRequestTemplate
} from '../templates/AngularTemplate';
import { toTitleCase } from '../utils/Utils';
import { ServiceNode } from '../provider/ServiceNodeProvider';
const { promises: fs } = require('fs');
const path = require('path');

export class AngularServiceGenerator extends AbstractServiceGenerator {
    public generateService(
        serviceName: string,
        requests: import('../provider/SavedRequestNodeProvider').CustomRequest[]
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
                        this.folderPath,
                        '..',
                        'app',
                        `${serviceName}-component`
                    );
                    fs.mkdir(folderPath);
                    await this.createRequests(serviceName, requests).then(
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
                    const service = new ServiceNode(
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
            .replace('$myImports', imports)
            .replace('$serviceName', toTitleCase(serviceName) + 'Service')
            .replace('$myFunctions', functions);
        await fs.writeFile(
            path.join(
                this._folderPath,
                '..',
                'app',
                `${serviceName}-component`,
                `${serviceName}.service.ts`
            ),
            content,
            'utf-8'
        );
        return Promise.resolve(
            path.join(
                this._folderPath,
                '..',
                'app',
                `${serviceName}-component`,
                `${serviceName}.service.ts`
            )
        );
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
            .replace(/\$myNameTitel/g, toTitleCase(componentName))
            .replace(
                /\$myServiceTitel/g,
                toTitleCase(componentName) + 'Service'
            )
            .replace(/\$myName/g, componentName)
            .replace(/\$myService/g, componentName + 'Service')
            .replace('$myFunctions', functions)
            .replace('$myVariables', variables);
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
const test_${request.requestName}data: ${request.type} ${
                    request.returnsList ? '[]' : ''
                } = 
                    ${
                        request.returnsList
                            ? `${JSON.stringify(JSON.parse(mockData))}`
                            : `{${JSON.stringify(JSON.parse(mockData))}}`
                    }

`);
                test_requests = test_requests.concat(`
const test_${request.label} = {
    "data":{
        "${request.requestName}": ${`test_${request.requestName}data`},
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
            .split('%imports%')
            .join(imports)
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
}
