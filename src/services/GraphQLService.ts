import {
    ExecutionResult,
    IntrospectionQuery,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLEnumType,
    buildSchema,
    GraphQLInputObjectType,
    parse,
    print,
    OperationDefinitionNode,
    FieldNode
} from 'graphql';
import {
    constructType,
    constructScalarField,
    constructEnumType,
    constructInputType,
    constructQuery,
    constructMutation
} from '../utils/MappingUtils';
import { LoggingService } from './LoggingService';
import * as vscode from 'vscode';
import { StateService } from './StateService';
import { Request } from '../provider/RequestNodeProvider';
import { QueryWrapper } from '../graphqlwrapper/QueryWrapper';
import { MutationWrapper } from '../graphqlwrapper/MutationWrapper';
import {
    stringToGraphQLFormat,
    toTitleCase,
    stringToGraphQLObject
} from '../utils/Utils';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ConfigurationService, Framework } from './ConfigurationService';
import { resolve } from 'dns';
import { angularService, angularComponent } from '../constants';
import { InputTypeWrapper } from '../graphqlwrapper/InputTypeWrapper';
import request from 'graphql-request';
import { ServiceNode } from '../provider/ServiceNodeProvider';
import { mkdir, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';

const fetch = require('node-fetch');
const {
    introspectionQuery,
    buildClientSchema,
    printSchema
} = require('graphql');
const { promises: fs } = require('fs');
const path = require('path');

/**
 * A GraphQL service class to retriev information about a GraphQL endpoint
 */
export class GraphQLService {
    private _folder: string;
    private _logger: LoggingService;

    /**
     * Constructor for GraphQLUtils
     * @param folder the folder where the generated files should be saved
     */
    constructor(
        private _state: StateService,
        private _config: ConfigurationService
    ) {
        this._folder = '.';
        this._logger = this._state.logger;
        this._config.onDidChangeFolder(e => {
            var curWorkspace = vscode.workspace.workspaceFolders;
            if (curWorkspace !== undefined) {
                this.folder = curWorkspace[0].uri.fsPath;
            }
        });
    }

    /**
     * * Async method to create a schema.gql file from a graphql endpoint
     * * Fetches an introspection query from the endpoint and builds a GraphQLSchema object
     * * The schema object is then saved as file and returned
     * @param endpoint graphql endpoint url as string
     */
    async getSchemaFromEndpoint(endpoint: string) {
        //Sends introspection query to endpoint
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: introspectionQuery })
        });

        //Check if response is available
        if (!response) {
            throw new Error(
                'Schema fetching went wrong, could not execute introspection query'
            );
        } else {
            try {
                let stats = fs.statSync(this._folder);
            } catch (e) {
                fs.mkdir(this._folder);
            }
        }
        var body: ExecutionResult;

        try {
            body = await response.json();
        } catch (FetchError) {
            fs.rmdir(this._folder);
            throw new Error(
                'Schema fetching went wrong, response did not contain any body'
            );
        }

        //Check if body got errors
        if (body.errors && body.errors.length > 0) {
            this._logger.logDebug(body.errors.join(','));
            fs.rmdir(this._folder);
            throw new Error(
                'Schema fetching went wrong, could not execute introspection query'
            );
        }

        //Check if body has data
        if (!body.data || !body.data.__schema) {
            fs.rmdir(this._folder);
            throw new Error(
                'Schema fetching went wrong, submitted url is not a graphql endpoint'
            );
        }

        try {
            //Create schema from data
            let schema: GraphQLSchema = buildClientSchema(
                body.data as IntrospectionQuery
            );
            //Save schema as gql file
            await fs.writeFile(
                path.join(this._folder, 'schema.gql'),
                printSchema(schema),
                'utf-8'
            );

            this.createTypesFromSchema(schema);
            this.getRequestsFromSchema(schema);

            if (this._config.typescript) {
                this.writeTypesToFile();
            }
            //Return schema object
            return schema;
        } catch (e) {
            throw new Error("Couldn't create schema from response");
        }
    }

    /**
     * * Async method to create a GraphQLSchema object from a file and return it a promise
     */
    async getSchemaFromFile(file: string): Promise<GraphQLSchema> {
        let schema: string = '';
        try {
            await fs
                .readFile(file, 'utf8')
                .then(data => {
                    schema = data;
                })
                .catch(err => {
                    console.log(err);
                    throw new Error('Could not read file');
                });
            let graphqlschema = buildSchema(schema);
            return Promise.resolve(graphqlschema);
        } catch (e) {
            throw new Error('Could not create schema object from given schema');
        }
    }

    /**
     * * Method to create and write typescript types to file
     * @param schema GraphQLSchema from endpoint
     */
    createTypesFromSchema(schema: GraphQLSchema) {
        this._state.clearState();
        const typeMap = schema.getTypeMap();
        const types = Object.values(typeMap)
            .sort((type1, type2) => type1.name.localeCompare(type2.name))
            .filter(type => !type.name.startsWith('__'));
        types.forEach(element => {
            if (element instanceof GraphQLObjectType) {
                this._state.types.push(constructType(element));
            } else if (element instanceof GraphQLScalarType) {
                this._state.scalar.addField(constructScalarField(element));
            } else if (element instanceof GraphQLEnumType) {
                this._state.enums.push(constructEnumType(element));
            } else if (element instanceof GraphQLInputObjectType) {
                this._state.inputTypes.push(constructInputType(element));
            }
        });
    }

    /**
     * * Method to write all types of the schema as typescript types to a file
     */
    async writeTypesToFile(): Promise<string> {
        let maybe = 'export type Maybe<T> = T | null; \n';
        let types = maybe
            .concat(this._state.scalar.toTypescriptType())
            .concat(
                this._state.types.map(ele => ele.toTypescriptType()).join('\n')
            )
            .concat(
                this._state.enums.map(ele => ele.toTypescriptType()).join('\n')
            )
            .concat(
                this._state.inputTypes
                    .map(ele => ele.toTypescriptType())
                    .join('\n')
            );
        try {
            await fs.writeFile(
                path.join(this._folder, 'schemaTypes.ts'),
                types,
                'utf-8'
            );
            return Promise.resolve(path.join(this._folder, 'schemaTypes.ts'));
        } catch (e) {
            throw new Error('Could not create file schemaTypes.ts');
        }
    }

    /**
     * * Method to get all queries and mutations from the graphql schema
     * @param schema GraphQLSchema object
     */
    getRequestsFromSchema(schema: GraphQLSchema) {
        let schemaQueries = schema.getQueryType();
        if (schemaQueries !== undefined && schemaQueries !== null) {
            const queryMap = schemaQueries.getFields();
            const query = Object.values(queryMap)
                .sort((type1, type2) => type1.name.localeCompare(type2.name))
                .filter(type => !type.name.toLowerCase().startsWith('query'));
            query.forEach(query => {
                const queryWrapper = constructQuery(query);
                const inputType = new InputTypeWrapper(
                    queryWrapper.Name + 'InputType',
                    `Input for ${queryWrapper.Name}Query`
                );
                queryWrapper.args.forEach(arg => inputType.addField(arg));
                this._state.requests.push(queryWrapper);
                this._state.inputTypes.push(inputType);
            });
        }
        let schemaMutations = schema.getMutationType();
        if (schemaMutations !== undefined && schemaMutations !== null) {
            const mutationMap = schemaMutations.getFields();
            const mutation = Object.values(mutationMap)
                .sort((type1, type2) => type1.name.localeCompare(type2.name))
                .filter(
                    type => !type.name.toLowerCase().startsWith('mutation')
                );
            mutation.forEach(mutation => {
                const mutationWrapper = constructMutation(mutation);
                const inputType = new InputTypeWrapper(
                    mutationWrapper.Name + 'InputType',
                    `Input for ${mutationWrapper.Name}Mutation`
                );
                mutationWrapper.args.forEach(arg => inputType.addField(arg));
                this._state.inputTypes.push(inputType);
                this._state.requests.push(mutationWrapper);
            });
        }
        vscode.commands.executeCommand('setContext', 'schemaLoaded', true);
    }

    /**
     * * Method to save a request to the state,
     * * breaks if a requests with the same name is already used
     */
    saveRequest(name: string, element: Request): Promise<CustomRequest> {
        return new Promise<CustomRequest>((resolve, reject) => {
            let alreadyUsed: boolean = false;
            this._state.myRequests.forEach(request => {
                if (request.label === name) {
                    reject(request);
                    alreadyUsed = true;
                }
            });
            if (!alreadyUsed) {
                if (element.contextValue?.match(/query/)) {
                    const root = element.toString();
                    const args =
                        element.args.length > 0
                            ? `(${element.args
                                  .map(arg => arg.toArgs())
                                  .join(' ')})`
                            : '';
                    const customRequest = new CustomRequest(
                        name,
                        element.label,
                        element.type,
                        stringToGraphQLFormat(
                            `query ${name}${args}{ ${root} }`
                        ),
                        `${element.label}InputType`,
                        element.args,
                        'Query',
                        { command: 'list.selectRequest', title: 'Select' }
                    );
                    this._state.saveRequest(customRequest);
                    resolve(customRequest);
                } else if (element.contextValue?.match(/mutation/)) {
                    const root = element.toString();
                    const args = element.args
                        .map(ele => ele.toArgs())
                        .join(' ');
                    const customRequest = new CustomRequest(
                        name,
                        element.label,
                        element.type,
                        stringToGraphQLFormat(
                            `mutation ${name}(${args}){ ${root} }`
                        ),
                        `${element.label}InputType`,
                        element.args,
                        'Mutation',
                        { command: 'list.selectRequest', title: 'Select' }
                    );
                    this._state.saveRequest(customRequest);
                    resolve(customRequest);
                }
            }
        });
    }

    /**
     * * Method to create a graphql service with a given name
     * @param serviceName Name of the created service
     */
    async createService(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string[]> {
        let files: string[] = new Array<string>();
        switch (+this._config.framework) {
            case Framework.ANGULAR:
                try {
                    const folderPath = path.join(
                        this.folder,
                        '..',
                        'app',
                        `${serviceName}-component`
                    );
                    fs.mkdir(folderPath);
                    await this.createRequests(
                        serviceName,
                        requests,
                        folderPath
                    ).then(file => {
                        files.push(file);
                    });
                    this.createAngularService(serviceName, requests).then(
                        files.push
                    );
                    this.createAngularComponent(serviceName, requests).then(
                        files.push
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
                break;

            case Framework.NONE:
                const folderPath = path.join(
                    this._folder,
                    '..',
                    `${serviceName}-service`
                );
                try {
                    fs.mkdir(folderPath);
                    this.createRequests(serviceName, requests, folderPath);
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
                    throw new Error('Could not create service ' + serviceName);
                }
        }
        return Promise.resolve(files);
    }

    /**
     * Method to write requests to file
     * @param serviceName Name of the service
     * @param requests Requests that should be created
     */
    private async createRequests(
        serviceName: string,
        requests: CustomRequest[],
        folderPath: string
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
            path.join(folderPath, `${serviceName}Requests.ts`),
            content,
            'utf-8'
        );
        return Promise.resolve(
            path.join(folderPath, `${serviceName}Requests.ts`)
        );
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
        let content: string = angularService;
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
                this._folder,
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
                this._folder,
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
        let content = angularComponent
            .replace(/\$myNameTitel/g, toTitleCase(componentName))
            .replace(
                /\$myServiceTitel/g,
                toTitleCase(componentName) + 'Service'
            )
            .replace(/\$myName/g, componentName)
            .replace(/\$myService/g, componentName + 'Service')
            .replace('$myFunctions', functions)
            .replace('$myVariables', variables);

        await fs.writeFile(
            path.join(
                this._folder,
                '..',
                'app',
                `${componentName}-component`,
                `${componentName}.component.ts`
            ),
            content,
            'utf-8'
        );
        return Promise.resolve(
            path.join(
                this._folder,
                '..',
                'app',
                `${componentName}-component`,
                `${componentName}.component.ts`
            )
        );
    }

    //#region From code creation
    async createServiceFromFolder(fsPath: string): Promise<ServiceNode> {
        return new Promise<ServiceNode>(async (resolve, reject) => {
            let serviceName = basename(fsPath);
            let dir = readdirSync(fsPath);

            const service = new ServiceNode(
                serviceName,
                'Custom Service',
                fsPath,
                2,
                'service'
            );

            const promised = await Promise.all(
                dir.map(async file => {
                    if (file.endsWith('.ts') || file.endsWith('.js')) {
                        const filePath = join(fsPath, file);
                        return this.getCustomRequestsFromFile(
                            filePath,
                            service
                        );
                    }
                })
            );
            if (promised) {
                if (service.requests.length > 0) {
                    this._state.saveService(service);
                    resolve(service);
                } else {
                    reject(
                        new Error(
                            'Could not create Service, because there were no requests found in directory'
                        )
                    );
                }
            } else {
                reject(
                    new Error(
                        'Could not create Service, because there were no requests found in directory'
                    )
                );
            }
        });
    }

    private async getCustomRequestsFromFile(
        filePath: string,
        service: ServiceNode
    ): Promise<ServiceNode> {
        return new Promise<ServiceNode>(async (resolve, reject) => {
            if (statSync(filePath).isFile()) {
                var doc = await vscode.workspace.openTextDocument(filePath);
                var idx = 0;
                var end = 0;
                while (doc.getText().includes('gql`', end + 1)) {
                    idx = doc.getText().indexOf('gql`', end);
                    end = doc.getText().indexOf('`;', idx);
                    var request = doc.getText().slice(idx + 4, end);
                    await this.getRequestFromString(request).then(
                        request => {
                            if (request) {
                                service.addRequest(request, filePath);
                            }
                        },
                        err => {
                            reject(err);
                        }
                    );
                }
                resolve(service);
            }
        });
    }

    /**
     * Async function to get a customrequest from a string
     * @param state StateService
     * @param graphqlService GraphQLService
     * @param requestAsString The request as a string
     */
    async getRequestFromString(
        requestAsString: string
    ): Promise<CustomRequest> {
        return new Promise<CustomRequest>(async (resolve, reject) => {
            let request: Request | undefined = undefined;
            try {
                request = await this.selectionValidation(requestAsString);
                if (request) {
                    const nameMatch: any = requestAsString.match(
                        /(?!(query$|mutation$)\s*)[a-zA-Z]+[a-zA-Z0-9]*/g
                    );
                    const name = nameMatch[1];

                    this._state.myRequests.forEach(myReq => {
                        if (name === myReq.label) {
                            resolve(myReq);
                        }
                    });

                    let result = await this.setRequestVariables(
                        stringToGraphQLObject(requestAsString),
                        request
                    );
                    this.saveRequest(name, result).then(
                        onfullfilled => {
                            if (onfullfilled) {
                                request?.deselect();
                                resolve(onfullfilled);
                            }
                        },
                        onreject => {
                            request?.deselect();
                            reject(onreject);
                        }
                    );
                }
            } catch (error) {
                request?.deselect();
                reject(error);
            }
        });
    }

    //#region Helperfunctions
    /**
     * Validates a request as string
     * @param selection Current selected text / request
     */
    private async selectionValidation(selection: string): Promise<Request> {
        return new Promise<Request>((resolve, reject) => {
            if (
                /**
                 * * Regex to match the beginning of a query | mutation
                 * * (query|mutation){1} [a-zA-Z]+(\((\$[a-zA-Z]+:\s*[a-zA-Z]+(\!)?((,\s?)|\)))+)*\s*{
                 * * Has to start with "query" or "mutation", then has a name that doesnt start with a digit
                 * * After that takes care that the query has either zero or at least one argument in form of "$argument:scalar"
                 * * Followed by an optional !. After that makes sure that either another argument is provided and seperated by a ,
                 * * or the bracket is closed with a ) after that the query starts with an {
                 */
                !selection.match(
                    /(query|mutation){1} [a-zA-Z]+[a-zA-Z0-9]*(\((\$[a-zA-Z]+:\s*[a-zA-Z]+(\!)?((,\s?)|\)))+)*\s*{/g
                ) &&
                !selection.match(/}$/)
            ) {
                throw new Error('Invalid request format');
            } else {
                let requestname = '';
                //const request = selection.match(/(?:\r\n?|\n)\s.*/g);
                const request = stringToGraphQLObject(selection);
                //Get name of request
                if (request) {
                    requestname = ((request
                        .definitions[0] as OperationDefinitionNode).selectionSet
                        .selections[0] as FieldNode).name.value;
                    const graphqlrequest:
                        | Request
                        | undefined = this._state.currentTree.find(
                        req => req.label === requestname
                    );
                    if (graphqlrequest) {
                        resolve(graphqlrequest);
                    } else {
                        throw new Error('Request was not found in schema');
                    }
                } else {
                    throw new Error('Request was not found in schema');
                }
                reject();
            }
        });
    }

    /**
     * Async method to select the fields of a request with a request as documentAST
     * @param documentAST Request as DocumentAST
     * @param request Request object that is used to select the fields
     */
    private async setRequestVariables(
        documentAST,
        request: Request
    ): Promise<Request> {
        return new Promise<Request>((resolve, reject) => {
            var def = documentAST.definitions[0];
            var fields = def.selectionSet.selections[0].selectionSet;
            fields.selections.forEach(async element => {
                await this.selectField(element, request.fields).then(
                    () => resolve(request),
                    () => reject()
                );
            });
        });
    }

    /**
     * Async recursive method that selects a single field of a request
     * @param field Field that should be selected
     * @param requestFields All fields of the current iterration
     */
    private async selectField(
        field,
        requestFields: Request[]
    ): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (field.selectionSet) {
                field.selectionSet.selections.forEach(selection => {
                    requestFields.forEach(req => {
                        if (req.label === field.name.value) {
                            this.selectField(selection, req.fields);
                        }
                    });
                });
            } else {
                requestFields.forEach(req => {
                    if (req.label === field.name.value) {
                        req.selected = true;
                        resolve(true);
                    }
                });
            }
            reject(false);
        });
    }
    //#endregion

    //#region getter and setter
    get folder(): string {
        return this._folder;
    }

    set folder(folder: string) {
        switch (this._config.framework) {
            case Framework.ANGULAR:
                this._folder = path.join(
                    folder,
                    'src',
                    this._config.generatedFolder
                );
                break;
            case Framework.NONE:
                this._folder = path.join(folder, this._config.generatedFolder);
                break;
            default:
                this._folder = path.join(folder, this._config.generatedFolder);
                break;
        }
    }
    //#endregion
}
