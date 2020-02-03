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
    print
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
import { stringToGraphQLFormat } from '../utils/Utils';
import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ConfigurationService } from './ConfigurationService';
import { resolve } from 'dns';

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
export default class GraphQLService {
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
            this._logger.logDebug(e);
            throw new Error("Couldn't create schema from response");
        }
    }

    /**
     * * Async method to create a GraphQLSchema object from a file and return it a promise
     */
    async getSchemaFromFile(file: string): Promise<GraphQLSchema> {
        let schema: string = '';
        await fs
            .readFile(file, 'utf8')
            .then(data => {
                schema = data;
            })
            .catch(err => {
                console.log(err);
                throw new Error('Could not read file');
            });
        try {
            return buildSchema(schema);
        } catch (e) {
            console.log(e);
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
    async writeTypesToFile() {
        let maybe = 'export type Maybe<T> = T | null \n';
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
            console.log(types);
            await fs.writeFile(
                path.join(this._folder, 'schemaTypes.ts'),
                types,
                'utf-8'
            );
        } catch (e) {
            this._logger.logDebug(e);
            vscode.window.showErrorMessage('Could not create file!');
        }
    }

    /**
     * Method to create a graphql service with a given name
     * @param serviceName Name of the created service
     */
    async createService(
        serviceName: string,
        requests: CustomRequest[]
    ): Promise<string[]> {
        let files: string[] = new Array<string>();
        await this.writeRequestsToFile(serviceName, requests).then(file => {
            files.push(file);
        });
        // ! TODO: Next -> select framwork and create a simple service which returns incoming values
        return Promise.resolve(files);
    }

    /**
     * Method to write the selected requests to a file
     * @param serviceName Name of the service
     */
    async writeRequestsToFile(
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
            path.join(this._folder, `${serviceName}Requests.ts`),
            content,
            'utf-8'
        );
        return Promise.resolve(
            path.join(this._folder, `${serviceName}Requests.ts`)
        );
    }

    async writeServiceToFile(serviceName: string, request: CustomRequest[]) {}

    /**
     * * Method to save a request to the state
     */
    saveRequest(name: string, element: Request) {
        if (element.contextValue?.match(/query/)) {
            const root = element.toString();
            const args = element.args.map(ele => ele.toArgs()).join(' ');
            this._state.saveRequest(
                new CustomRequest(
                    name,
                    'query',
                    stringToGraphQLFormat(`query ${name}(${args}){ ${root} }`),
                    element.args,
                    { command: 'list.selectRequest', title: 'Select' }
                )
            );
        } else if (element.contextValue?.match(/mutation/)) {
            const root = element.toString();
            const args = element.args.map(ele => ele.toArgs()).join(' ');
            this._state.saveRequest(
                new CustomRequest(
                    name,
                    'mutation',
                    stringToGraphQLFormat(
                        `mutation ${name}(${args}){ ${root} }`
                    ),
                    element.args,
                    { command: 'list.selectRequest', title: 'Select' }
                )
            );
        }
    }

    /**
     * Method to get all queries and mutations from the graphql schema
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
                this._state.requests.push(constructQuery(query));
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
                this._state.requests.push(constructMutation(mutation));
            });
        }
        vscode.commands.executeCommand('setContext', 'schemaLoaded', true);
    }

    //#region getter and setter
    get folder(): string {
        return this._folder;
    }

    set folder(folder: string) {
        this._folder = path.join(folder, this._config.generatedFolder);
    }
    //#endregion
}
