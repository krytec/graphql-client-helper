import { ExecutionResult, IntrospectionQuery } from 'graphql';

const fetch = require('node-fetch');
const {
    introspectionQuery,
    buildClientSchema,
    printSchema,
    GraphQLSchema
} = require('graphql');
const { promises: fs } = require('fs');
const path = require('path');

// Utils to query on endpoint
export default class GraphQLUtils {
    private folder: string = '';

    //Default constructor
    constructor(folder: string) {
        this.folder = path.join(folder, 'graphqlschema');
        try {
            let stats = fs.statSync(this.folder);
        } catch (e) {
            fs.mkdir(this.folder);
        }
    }

    //Runs the introspection query on a given endpoint, creates a schema and returns it
    public async getSchemaFromEndpoint(endpoint: string) {
        //Sends introspection query to endpoint
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: introspectionQuery })
        });

        //Check if response is available
        if (!response) {
            fs.rmdir(this.folder);
            throw new Error(
                'Schema fetching went wrong, could not execute introspection query'
            );
        }
        var body: ExecutionResult;

        try {
            body = await response.json();
        } catch (FetchError) {
            fs.rmdir(this.folder);
            throw new Error(
                'Schema fetching went wrong, response did not contain any body'
            );
        }

        //Check if body got errors
        if (body.errors && body.errors.length > 0) {
            fs.rmdir(this.folder);
            throw new Error(
                'Schema fetching went wrong, could not execute introspection query'
            );
        }

        //Check if body has data
        if (!body.data || !body.data.__schema) {
            fs.rmdir(this.folder);
            throw new Error(
                'Schema fetching went wrong, submitted url is no graphql endpoint'
            );
        }

        //path to save the introspectionquery result as json
        let resultpath = path.join(this.folder, 'result.json');

        //write json file
        await fs.writeFile(
            resultpath,
            JSON.stringify(body.data, null, 2),
            'utf-8'
        );

        try {
            //Create schema from data
            let schema = buildClientSchema(body.data as IntrospectionQuery);
            //Save schema as gql file
            await fs.writeFile(
                path.join(this.folder, 'schema.gql'),
                printSchema(schema),
                'utf-8'
            );
            //Return schema object
            return schema;
        } catch (e) {
            throw new Error("Couldn't create schema from response");
        }
    }
}
