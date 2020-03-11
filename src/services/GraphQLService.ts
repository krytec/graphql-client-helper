import {
    ExecutionResult,
    IntrospectionQuery,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLEnumType,
    buildSchema,
    GraphQLInputObjectType,
    OperationDefinitionNode,
    FieldNode,
    GraphQLNonNull,
    GraphQLList,
    GraphQLInterfaceType,
    validate,
    GraphQLError
} from 'graphql';
import { LoggingService } from './LoggingService';
import * as vscode from 'vscode';
import { StateService } from './StateService';
import { Request } from '../provider/RequestNodeProvider';
import { QueryWrapper } from '../graphqlwrapper/QueryWrapper';
import { MutationWrapper } from '../graphqlwrapper/MutationWrapper';
import {
    stringToGraphQLFormat,
    stringToGraphQLObject,
    validateRequest
} from '../utils/Utils';
import { CustomRequest } from '../provider/CustomRequestNodeProvider';
import { ConfigurationService, Framework } from './ConfigurationService';
import { InputTypeWrapper } from '../graphqlwrapper/InputTypeWrapper';
import { Service } from '../provider/ServiceNodeProvider';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { TypeWrapper } from '../graphqlwrapper/TypeWrapper';
import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';
import { ScalarFieldWrapper } from '../graphqlwrapper/ScalarWrapper';
import { EnumWrapper } from '../graphqlwrapper/EnumWrapper';
import { InterfaceWrapper } from '../graphqlwrapper/InterfaceWrapper';
import { graphaxjsonTemplate } from '../constants';
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
     * Constructor for GraphQLService
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
            const schema = buildClientSchema(body.data as IntrospectionQuery);
            //Save schema as gql file
            await fs.writeFile(
                path.join(this._folder, 'schema.gql'),
                printSchema(schema),
                'utf-8'
            );

            await fs.writeFile(
                path.join(this._folder, 'graphax.json'),
                graphaxjsonTemplate,
                'utf-8'
            );

            if (schema) {
                this.createTypesFromSchema(schema);
                this.getRequestsFromSchema(schema);
            }

            if (this._config.typescript) {
                this.writeTypesToFile();
            }
            //Return schema object
            this._state.schema = schema;
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
                    throw new Error('Could not read file');
                });
            const schemaObject = buildSchema(schema);
            this._state.schema = schemaObject;
            return Promise.resolve(schemaObject);
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
            if (!element.name.startsWith('_')) {
                if (element instanceof GraphQLObjectType) {
                    this._state.types.push(this.constructType(element));
                } else if (element instanceof GraphQLScalarType) {
                    this._state.scalar.addField(
                        this.constructScalarField(element)
                    );
                } else if (element instanceof GraphQLEnumType) {
                    this._state.enums.push(this.constructEnumType(element));
                } else if (element instanceof GraphQLInterfaceType) {
                    this._state.interfaces.push(
                        this.constructInterface(element)
                    );
                } else if (element instanceof GraphQLInputObjectType) {
                    this._state.inputTypes.push(
                        this.constructInputType(element)
                    );
                }
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
                this._state.interfaces
                    .map(ele => ele.toTypescriptType())
                    .join('\n')
            )
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
            var filePath = path.join(this._folder, 'schemaTypes.ts');
            await fs.writeFile(filePath, types, 'utf-8');
            this._logger.logDebug('Created file: ' + filePath);
            return Promise.resolve(filePath);
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
                const queryWrapper = this.constructQuery(query);
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
                const mutationWrapper = this.constructMutation(mutation);
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
                        element.returnsList,
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
                        element.returnsList,
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

    //#region graphax.json
    /**
     * Async method to load services from graphax.json file
     */
    async loadGraphaxJSON() {
        return new Promise<any>((resolve, reject) => {
            const jsonPath = join(this._folder, 'graphax.json');
            if (existsSync(jsonPath)) {
                const graphaxJSON = JSON.parse(readFileSync(jsonPath, 'utf-8'));
                graphaxJSON.service.forEach(service => {
                    if (existsSync(service.path)) {
                        this.createServiceFromFolder(service.path);
                        this._logger.logDebug(
                            'Loaded service ' +
                                service.name +
                                ' from graphax.json'
                        );
                    } else {
                        reject('Invalid path. Service was not found.');
                    }
                });
                resolve('Successfully loaded services.');
            } else {
                reject(
                    'GraphaX.json does not exists in directory: ' + this._folder
                );
            }
        });
    }

    /**
     * Async method to write a serive to the graphax.json file
     * @param service Service that should be addet to the graphax.json
     */
    public async writeServiceToGraphaxJSON(service: Service) {
        return new Promise<any>(async (resolve, reject) => {
            const jsonPath = join(this._folder, 'graphax.json');
            if (existsSync(jsonPath)) {
                const graphaxJSON = JSON.parse(readFileSync(jsonPath, 'utf-8'));
                graphaxJSON.service.push({
                    name: service.label,
                    path: service.path
                });
                await fs.writeFile(
                    jsonPath,
                    JSON.stringify(graphaxJSON),
                    'utf-8'
                );
                resolve('Successfully saved service.');
            } else {
                reject(
                    'GraphaX.json does not exists in directory: ' + this._folder
                );
            }
        });
    }

    /**
     * Async method to remove a service from the graphax.json file
     * @param service The service that should be removed from json
     */
    public async removeServiceFromGraphaxJSON(service: Service) {
        return new Promise<any>(async (resolve, reject) => {
            const jsonPath = join(this._folder, 'graphax.json');
            if (existsSync(jsonPath)) {
                const graphaxJSON = JSON.parse(readFileSync(jsonPath, 'utf-8'));
                const serviceToDelete = graphaxJSON.service.find(
                    obj =>
                        obj.name === service.label && obj.path === service.path
                );
                const idx = graphaxJSON.service.indexOf(serviceToDelete, 0);
                if (idx > -1) {
                    graphaxJSON.service.splice(idx, 1);
                }
                await fs.writeFile(
                    jsonPath,
                    JSON.stringify(graphaxJSON),
                    'utf-8'
                );
                resolve('Successfully removed service.');
            } else {
                reject(
                    'GraphaX.json does not exists in directory: ' + this._folder
                );
            }
        });
    }
    //#endregion

    //#region From code creation
    /**
     * Async method to create a service from a given folder
     * If the folder has any .ts or .js file the getCustomRequestFromFile method will be called
     * @param fsPath Path to folder
     */
    async createServiceFromFolder(fsPath: string): Promise<Service> {
        return new Promise<Service>(async (resolve, reject) => {
            let serviceName = basename(fsPath);
            let dir = readdirSync(fsPath);

            let service = new Service(
                serviceName,
                'Custom Service',
                fsPath,
                2,
                'service'
            );

            const promised = new Array<Service | String>();
            for (const file of dir) {
                if (file.endsWith('.ts') || file.endsWith('.js')) {
                    const filePath = join(fsPath, file);
                    await this.getCustomRequestsFromFile(
                        filePath,
                        service
                    ).then(
                        resolved => {},
                        rejected => {
                            if (rejected) {
                                promised.push(rejected);
                            }
                        }
                    );
                }
            }

            if (promised.length === 0) {
                if (service.requests.length > 0) {
                    this._state.saveService(service);
                    resolve(service);
                } else {
                    reject(
                        new Error(
                            'Could not create Service, because there were no requests found in directory.'
                        )
                    );
                }
            } else {
                reject(
                    new Error(
                        'Could not create Service, because there were invalid requests provided in service.'
                    )
                );
            }
        });
    }

    /**
     * Reads the file and gets all requests within that file.
     * If a request is found the getRequestFromString method will be called
     * After the called method was successful the request will be addet to the service
     * @param filePath Path to file
     * @param service Service that should be created
     */
    private async getCustomRequestsFromFile(
        filePath: string,
        service: Service
    ): Promise<Service | String> {
        return new Promise<Service | String>(async (resolve, reject) => {
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
                            reject('Invalid request provided!');
                        }
                    );
                }
                resolve(service);
            }
        });
    }

    /**
     * Async function to get a customrequest from a string
     * And adds it to the state
     * @param state StateService
     * @param graphqlService GraphQLService
     * @param requestAsString The request as a string
     */
    async getRequestFromString(
        requestAsString: string
    ): Promise<CustomRequest> {
        return new Promise<CustomRequest>(async (resolve, reject) => {
            let request: Request | undefined = undefined;
            if (this._state.schema) {
                const validationArray = validateRequest(
                    this._state.schema,
                    requestAsString
                );
                if (validationArray.length > 0) {
                    reject(validationArray);
                } else {
                    try {
                        request = await this.selectionValidation(
                            requestAsString
                        );
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
                }
            } else {
                reject('No schema found!');
            }
        });
    }
    //#endregion

    //#region helperfunctions
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
    async setRequestVariables(documentAST, request: Request): Promise<Request> {
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
            if (field.selectionSet !== undefined) {
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
                        return;
                    }
                });
            }
            resolve(true);
        });
    }

    /**
     * Method to construct a TypeWrapper from a GraphQLObjectType
     * @param type GraphQLObjectType
     */
    private constructType(type: GraphQLObjectType): TypeWrapper {
        let constructedType = new TypeWrapper(
            type.name,
            type.description ? type.description : undefined
        );
        let interfaces = Object.values(type.getInterfaces());
        interfaces.forEach(element => {
            let interfaceWrapper: InterfaceWrapper | undefined = undefined;
            this._state.interfaces.forEach(i => {
                if (i.name === element.name) {
                    interfaceWrapper = i;
                }
            });
            if (interfaceWrapper === undefined) {
                interfaceWrapper = this.constructInterface(element);
            }
            constructedType.addInterface(interfaceWrapper);
        });
        let fields = Object.values(type.getFields());
        fields.forEach(element => {
            let field: FieldWrapper = this.constructField(element);
            constructedType.addField(field);
        });

        return constructedType;
    }

    /**
     * Method to construct an InterfaceWrapper from a GraphQLObjectType
     * @param type GraphQLObjectType
     */
    private constructInterface(type: GraphQLInterfaceType): InterfaceWrapper {
        let constructedInterface = new InterfaceWrapper(
            type.name,
            type.description ? type.description : undefined
        );
        let fields = Object.values(type.getFields());
        fields.forEach(element => {
            let field: FieldWrapper = this.constructField(element);
            constructedInterface.addField(field);
        });

        return constructedInterface;
    }

    /**
     * Method to construct a FieldWrapper from a GraphQLType
     * @param field Field of a GraphQLType
     */
    private constructField(field: any): FieldWrapper {
        let name = field.name;
        let nonNull = false;
        let isScalar = false;
        let ofType = '';
        let isList = false;
        let listNonNull = false;
        let description = field.description;
        let args = field.args;
        if (field.type instanceof GraphQLNonNull) {
            nonNull = true;
            if (
                field.type.ofType instanceof GraphQLObjectType ||
                field.type.ofType instanceof GraphQLInputObjectType
            ) {
                ofType = field.type.ofType.name;
                nonNull = true;
            } else if (field.type.ofType instanceof GraphQLScalarType) {
                isScalar = true;
                ofType = field.type.ofType.name;
            } else if (field.type.ofType instanceof GraphQLEnumType) {
                ofType = field.type.ofType.name;
            } else if (field.type.ofType instanceof GraphQLList) {
                if (field.type.ofType.ofType instanceof GraphQLNonNull) {
                    ofType = field.type.ofType.ofType.ofType.name;
                    isList = true;
                    listNonNull = true;
                } else {
                    ofType = field.type.ofType.ofType.name;
                    isList = true;
                }
            }
        } else if (field.type instanceof GraphQLScalarType) {
            isScalar = true;
            ofType = field.type.name;
        } else if (field.type instanceof GraphQLEnumType) {
            ofType = field.type.name;
        } else if (field.type instanceof GraphQLList) {
            isList = true;
            if (field.type.ofType instanceof GraphQLNonNull) {
                var listtype = field.type.ofType.ofType;
                listNonNull = true;
                if (
                    listtype instanceof GraphQLObjectType ||
                    listtype instanceof GraphQLInputObjectType
                ) {
                    ofType = listtype.name;
                    listNonNull = true;
                } else if (listtype instanceof GraphQLScalarType) {
                    isScalar = true;
                    listNonNull = true;
                    ofType = listtype.name;
                } else if (listtype instanceof GraphQLEnumType) {
                    ofType = listtype.name;
                    listNonNull = true;
                }
            } else {
                ofType = field.type.ofType.name;
            }
        } else if (
            field.type instanceof GraphQLObjectType ||
            field.type instanceof GraphQLInputObjectType
        ) {
            ofType = field.type.name;
        }
        const fieldWrapper = new FieldWrapper(
            name,
            nonNull,
            isScalar,
            isList,
            listNonNull,
            ofType,
            description
        );

        if (args !== undefined && args.length > 0) {
            args.forEach(argument => {
                fieldWrapper.args.push(this.constructField(argument));
            });
        }

        return fieldWrapper;
    }

    /**
     * Method to create a Scalar from a GraphQLScalarType
     * @param scalarType GraphQLScalarType
     */
    private constructScalarField(
        scalarType: GraphQLScalarType
    ): ScalarFieldWrapper {
        let name = scalarType.name;
        let description = scalarType.description;
        let type = 'any';
        if (
            scalarType.name === 'Int' ||
            scalarType.name === 'Float' ||
            scalarType.name === 'Double'
        ) {
            type = 'number';
        } else if (scalarType.name === 'String' || scalarType.name === 'ID') {
            type = 'string';
        } else if (scalarType.name === 'Boolean') {
            type = 'boolean';
        }
        return new ScalarFieldWrapper(
            name,
            type,
            description ? description : undefined
        );
    }

    /**
     * Creates a InputTypeWrapper from a GraphQLInputObjectType and returns it
     * @param inputType GraphQLInputObjectType
     */
    private constructInputType(inputType: GraphQLInputObjectType) {
        let inputTypeWrapper = new InputTypeWrapper(
            inputType.name,
            inputType.description ? inputType.description : undefined
        );

        let fields = Object.values(inputType.getFields());
        fields.forEach(field => {
            var fieldWrapper = this.constructField(field);
            inputTypeWrapper.addField(fieldWrapper);
        });
        return inputTypeWrapper;
    }

    /**
     * Method to construct a EnumWrapper from a GraphQLEnumType
     * @param enumType GraphQLEnumType
     */
    private constructEnumType(enumType: GraphQLEnumType) {
        return new EnumWrapper(
            enumType.name,
            enumType.getValues(),
            enumType.description ? enumType.description : undefined
        );
    }

    /**
     * Method to construct a QueryWrapper from a query object
     * @param query Query
     */
    private constructQuery(query: any): QueryWrapper {
        var queryAsField = this.constructField(query);
        const queryWrapper = new QueryWrapper(
            queryAsField.name,
            queryAsField.ofType,
            queryAsField.isList,
            queryAsField.description
        );
        queryWrapper.args = queryAsField.args;
        return queryWrapper;
    }

    /**
     * Method to construct a MutationWrapper from a mutation object
     * @param mutation mutation
     */
    private constructMutation(mutation: any): MutationWrapper {
        var mutationAsField = this.constructField(mutation);
        const mutationWrapper = new MutationWrapper(
            mutationAsField.name,
            mutationAsField.ofType,
            mutationAsField.isList,
            mutationAsField.description
        );
        mutationWrapper.args = mutationAsField.args;
        return mutationWrapper;
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
            case Framework.REACT:
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
