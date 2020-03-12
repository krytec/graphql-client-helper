import { GraphQLService } from '../../services/GraphQLService';
import { expect } from 'chai';
import { GraphQLObjectType } from 'graphql';
import { LoggingService } from '../../services/LoggingService';
import { StateService } from '../../services/StateService';
import {
    ConfigurationService,
    Framework
} from '../../services/ConfigurationService';
import { RequestNodeProvider } from '../../provider/RequestNodeProvider';
import { ServiceGenerator } from '../../generators/ServiceGenerator';
import { GraphQLClientService } from '../../services/GraphQLClientService';
import * as vscode from 'vscode';
import { join } from 'path';
import del = require('del');
const fs = require('fs');
const path = require('path');

describe('Test functions GraphaX extension', function() {
    let state = new StateService(new LoggingService());
    let config: ConfigurationService = new ConfigurationService();
    config.framework = Framework.NONE;
    let graphQLService = new GraphQLService(state, config);
    let requestNodeProvider = new RequestNodeProvider(state);
    graphQLService.folder = __dirname;
    describe('GraphQLServiceTest to test if invalid endpoint throws error', () => {
        let url: string = 'http://google.com';
        let current_dir: string = path.join(__dirname, 'graphqlschema');
        it('should return false since the folder is only created after schema was fetched', () => {
            expect(fs.existsSync(current_dir)).to.equal(false);
        });
        it('should throw an error, response does not contain a body', async () => {
            this.timeout(0);
            await graphQLService
                .getSchemaFromEndpoint(url)
                .catch(err => expect(err).to.be.instanceOf(Error));
        });
        it('should return false, since the folder gets deleted if error is thrown', () => {
            expect(fs.existsSync(current_dir)).to.equal(false);
        });
    });

    describe('GraphQLServiceTest to test if schema is correctly created from file', () => {
        let schema;
        it('should return the schema as a GraphQLSchemaObject', () => {
            graphQLService
                .getSchemaFromFile(
                    path.join(__dirname, '../../../resources/schema.gql')
                )
                .then(object => {
                    expect(object.getType('Attack')).to.be.instanceOf(
                        GraphQLObjectType
                    );
                    schema = object;
                });
        });
        it('should create type wrappers from GraphQLSchema', () => {
            graphQLService.createTypesFromSchema(schema);
            expect(state.enums.length).is.equals(1);
            expect(state.types.length).is.equals(6);
        });

        it('should create requests from GraphQL schema', () => {
            if (state.schema) {
                graphQLService.getRequestsFromSchema(state.schema);
                expect(state.requests.length).to.equals(2);
            }
        });
    });

    describe('NodeRequestProviderTest to test the creation of Requests and the current tree', () => {
        it('should create tree items', () => {
            requestNodeProvider.getChildren();
            expect(state.currentTree.length).is.equals(2);
        });
    });

    describe('GraphQLServiceTest to test the creation of a customrequest', () => {
        it('should select fields', () => {
            state.currentTree[0].fields[0].selected = true;
            expect(state.currentTree[0].selected).is.true;
        });

        it('should create myQuery', () => {
            graphQLService.saveRequest('myQuery', state.currentTree[0]);
            expect(state.myRequests.length).is.equals(1);
            expect(state.myRequests[0].label).is.equals('myQuery');
        });

        it('should deselect fields', () => {
            state.currentTree[0].deselect();
            expect(state.currentTree[0].selected).is.false;
        });

        let myStringQuery = `query myStringQuery($first:Int!){
            pokemons(first:$first){
                id
                number
                name
            }
        }
        `;
        it('should create a customrequest from string', async () => {
            await graphQLService.getRequestFromString(myStringQuery);
            expect(state.myRequests.length).is.equals(2);
            expect(state.myRequests[1].label).is.equals('myStringQuery');
        });

        it('should fail to create customrequest from string', async () => {
            await graphQLService
                .getRequestFromString(myStringQuery)
                .then(undefined, reject => {
                    expect(reject.label).is.equals('myStringQuery');
                    expect(state.myRequests.length).is.equals(2);
                });
        });

        it('should fail to create a customrequest from string', async () => {
            let myFailedQuery = `query myFailedQuery{
                pokemons{
                    id
                    number
                    name
                }
            }`;
            graphQLService
                .getRequestFromString(myFailedQuery)
                .then(
                    resolve => {},
                    err => {
                        expect(err).to.be('array');
                    }
                )
                .catch(err => {
                    expect(err).to.be('array');
                });
        });
    });

    describe('serviceGeneratorTest to test the creation of a service without any framework implementation', () => {
        const client: GraphQLClientService = new GraphQLClientService(config);
        const serviceGenerator: ServiceGenerator = new ServiceGenerator(
            state,
            config,
            client,
            graphQLService
        );
        serviceGenerator.folderPath = vscode.env.appRoot;
        it('should create service with a single request', () => {
            return serviceGenerator
                .generateService('myService', [state.myRequests[0]])
                .then(
                    resolve => {
                        expect(state.services.length).is.equals(1);
                        const dir = del.sync(['*.ts', '*.tsx'], {
                            cwd: state.services[0].path,
                            force: true
                        });
                        try {
                            fs.rmdirSync(state.services[0].path);
                        } catch (err) {}
                    },
                    rejects => {}
                );
        });
    });
});
