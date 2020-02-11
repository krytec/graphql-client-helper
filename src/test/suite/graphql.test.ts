import { GraphQLService } from '../../services/GraphQLService';
import { expect } from 'chai';
import { GraphQLObjectType } from 'graphql';
import { LoggingService } from '../../services/LoggingService';
import { StateService } from '../../services/StateService';
import { ConfigurationService } from '../../services/ConfigurationService';

const fs = require('fs');
const path = require('path');

describe('Test functions of GraphQLService class', function() {
    let state = new StateService(new LoggingService());
    let config = new ConfigurationService();
    let graphQLService = new GraphQLService(state, config);
    graphQLService.folder = __dirname;
    describe('GraphQLUtilTest to test if invalid endpoint throws error', () => {
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

    describe('graphQLServiceTest to test if schema is correctly created from file', () => {
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
    });
});
