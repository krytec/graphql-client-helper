import {
    ExecutionResult,
    IntrospectionQuery,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLEnumType,
    buildSchema,
    GraphQLInputObjectType
} from 'graphql';
import {
    constructType,
    constructScalarField,
    constructEnumType,
    constructInputType
} from '../utils/WrapperUtils';
import { TypeWrapper } from '../wrapper/GraphQLTypeWrapper';
import { ScalarWrapper } from '../wrapper/GraphQLScalarWrapper';
import { EnumWrapper } from '../Wrapper/GraphQLEnumWrapper';
import { InputTypeWrapper } from '../wrapper/GraphQLInputTypeWrapper';
import { LoggingService } from './LoggingService';
import { workspace, WorkspaceFoldersChangeEvent } from 'vscode';
import { ENETDOWN } from 'constants';
import { generatedFolder } from '../constants';

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
    private _types: Array<TypeWrapper> = new Array<TypeWrapper>();
    private _scalar: ScalarWrapper = new ScalarWrapper();
    private _enums: Array<EnumWrapper> = new Array<EnumWrapper>();
    private _inputtypes: Array<InputTypeWrapper> = new Array<
        InputTypeWrapper
    >();

    /**
     * Constructor for GraphQLUtils
     * @param folder the folder where the generated files should be saved
     */
    constructor(private logger: LoggingService) {
        this._folder = '.';
    }

    /**
     * * Async function to create a schema.gql file from a graphql endpoint
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
            fs.rmdir(this._folder);
            throw new Error(
                'Schema fetching went wrong, could not execute introspection query'
            );
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
            this.logger.logDebug(body.errors.join(','));
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
            //Return schema object
            return schema;
        } catch (e) {
            this.logger.logDebug(e);
            throw new Error("Couldn't create schema from response");
        }
    }

    /**
     * * Async function to create a GraphQLSchema object from a file and return it a promise
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
     * * Function to create and write typescript types to file
     * @param schema GraphQLSchema from endpoint
     */
    createTypesFromSchema(schema: GraphQLSchema) {
        const typeMap = schema.getTypeMap();
        const types = Object.values(typeMap)
            .sort((type1, type2) => type1.name.localeCompare(type2.name))
            .filter(type => !type.name.startsWith('__'));

        types.forEach(element => {
            if (element instanceof GraphQLObjectType) {
                this._types.push(constructType(element));
            } else if (element instanceof GraphQLScalarType) {
                this._scalar.addField(constructScalarField(element));
            } else if (element instanceof GraphQLEnumType) {
                this._enums.push(constructEnumType(element));
            } else if (element instanceof GraphQLInputObjectType) {
                this._inputtypes.push(constructInputType(element));
            }
        });

        this.logger.logDebug(this._scalar.toTypescriptType() as string);
        this.logger.logDebug(
            this._types.map(ele => ele.toTypescriptType()).join('\n')
        );
        this.logger.logDebug(
            this._enums.map(ele => ele.toTypescriptType()).join('\n')
        );
        this.logger.logDebug(
            this._inputtypes.map(ele => ele.toTypescriptType()).join('\n')
        );
    }

    /**
     * * Function to generate all types of the current selected file
     * * and write them to a file
     */
    writeTypesToFile() {}

    //#region getter and setter
    get folder(): string {
        return this._folder;
    }

    set folder(folder: string) {
        this._folder = path.join(folder, generatedFolder);
        try {
            let stats = fs.statSync(this._folder);
        } catch (e) {
            fs.mkdir(this._folder);
        }
    }

    get types() {
        return this._types;
    }

    get inputTypes() {
        return this._inputtypes;
    }

    get enums() {
        return this._enums;
    }

    get scalar() {
        return this._scalar;
    }
    //#endregion
}
