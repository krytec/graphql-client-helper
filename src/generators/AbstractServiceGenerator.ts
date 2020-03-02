import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { StateService } from '../services/StateService';
import { ConfigurationService } from '../services/ConfigurationService';
import { stringToGraphQLObject } from '../utils/Utils';
import { Request } from '../provider/RequestNodeProvider';
import { GraphQLClientService } from '../services/GraphQLClientService';
import { GraphQLService } from '../services/GraphQLService';
const { promises: fs } = require('fs');
const path = require('path');

export abstract class AbstractServiceGenerator {
    protected _folderPath = '';
    constructor(
        protected _state: StateService,
        protected _config: ConfigurationService,
        protected _client: GraphQLClientService,
        protected _graphqlService: GraphQLService
    ) {}
    public abstract async generateService(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string[]>;

    /**
     * Method to write requests to file
     * @param serviceName Name of the service
     * @param requests Requests that should be created
     */
    protected async createRequests(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string> {
        let content = `import gql from 'graphql-tag';\n`;
        var gqlrequests = requests
            .map(
                request =>
                    `export const ${request.label} = gql\`${request.request}\`;`
            )
            .join('\n');
        content = content.concat(gqlrequests);
        await fs.writeFile(
            path.join(this._folderPath, `${serviceName}Requests.ts`),
            content,
            'utf-8'
        );
        return Promise.resolve(
            path.join(this._folderPath, `${serviceName}Requests.ts`)
        );
    }

    /**
     * Private async method to create mocking data for tests
     * @param request CustomRequests
     */
    protected async getMockingData(request: CustomRequest): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let mockingData = '';
            await this._client.executeRequest(request.request, null).then(
                data => {
                    mockingData = data;
                    resolve(
                        mockingData.slice(
                            mockingData.indexOf(':') + 1,
                            mockingData.lastIndexOf('}')
                        )
                    );
                },
                error => {
                    resolve(this.createMockingData(request));
                }
            );
        });
    }

    /**
     * Method to create random mocking data for tests
     * @param request the request the mocking data is created for
     */
    protected async createMockingData(request: CustomRequest): Promise<string> {
        let mockingData = '';
        let mockRequest = this._state.currentTree.filter(
            item => item.label === request.requestName
        )[0];
        await this._graphqlService
            .setRequestVariables(
                stringToGraphQLObject(request.request),
                mockRequest
            )
            .then(request => (mockRequest = request));

        let length = 1;
        if (mockRequest.returnsList) {
            length = Math.random() + 1 * 20;
            for (let index = 0; index < length; index++) {
                let fieldAsString = '';
                mockRequest.fields.forEach(field => {
                    if (field.selected) {
                        if (fieldAsString.trim() !== '') {
                            fieldAsString = fieldAsString.concat(`,\n`);
                        }
                        fieldAsString = fieldAsString.concat(
                            `${this.createMockForField(field)}`
                        );
                    }
                });
                if (index + 1 < length) {
                    mockingData = mockingData.concat(`{${fieldAsString}},`);
                } else {
                    mockingData = mockingData.concat(`{${fieldAsString}}`);
                }
            }
            mockingData = `[${mockingData}]`;
        } else {
            mockRequest.fields.forEach(field => {
                if (field.selected) {
                    if (mockingData.trim() !== '') {
                        mockingData = mockingData.concat(`,\n`);
                    }
                    mockingData = mockingData.concat(
                        `${this.createMockForField(field)}`
                    );
                }
            });
            mockingData = `{${mockingData}}`;
        }
        mockRequest.deselect();
        return mockingData;
    }

    /**
     * Method to create mocking data for each field of the request
     * @param request Request that should be mocked
     */
    private createMockForField(request: Request): string {
        let mockField = '';
        let fields = ``;
        if (request.fields.length > 0) {
            for (const req of request.fields) {
                if (req.selected) {
                    fields = fields.concat(this.createMockForField(req) + ',');
                }
            }
            mockField = `"${request.label}":{${fields.slice(
                0,
                fields.lastIndexOf(`,`)
            )}}`;
        } else {
            let mock = '';
            if (request.type === 'String') {
                mock = Math.random()
                    .toString(36)
                    .replace(/[^a-z]+/g, '')
                    .substr(1, (Math.random() + 1) * 15);
            } else if (request.type === 'Int') {
                mock = Math.floor(Math.random() * 15).toString();
            } else if (request.type === 'Float') {
                mock = (Math.random() * 15).toString();
            } else if (request.type === 'Boolean') {
                var i = Math.random();
                mock = i <= 0.5 ? 'true' : 'false';
            } else {
                mock = Math.random()
                    .toString(36)
                    .replace(/[^a-z]+/g, '')
                    .substr(1, (Math.random() + 1) * 15);
            }
            mockField = `"${request.label}":"${mock}"`;
        }
        return mockField;
    }

    set folderPath(value: string) {
        this._folderPath = this.folderPath;
    }
}
