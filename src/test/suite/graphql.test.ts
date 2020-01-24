import GraphQLUtils from '../../services/GraphQLService';
import { expect } from 'chai';
import { GraphQLObjectType } from 'graphql';
import { LoggingService } from '../../services/LoggingService';
const fs = require('fs');
const path = require('path');

describe('Test functions of GraphQLUtil class', function() {
    let graphQLUtil = new GraphQLUtils(new LoggingService());
    graphQLUtil.folder = __dirname;
    describe('GraphQLUtilTest to test if invalid endpoint throws error', () => {
        let url: string = 'http://google.com';
        let current_dir: string = path.join(__dirname, 'graphqlschema');
        it('should return true since the folder is created after creating instance of GraphQLUtils', () => {
            expect(fs.existsSync(current_dir)).to.equal(true);
        });
        it('should throw an error, response does not contain a body', async () => {
            this.timeout(0);
            await graphQLUtil
                .getSchemaFromEndpoint(url)
                .catch(err => expect(err).to.be.instanceOf(Error));
        });
        it('should return false, since the folder gets deleted if error is thrown', () => {
            expect(fs.existsSync(current_dir)).to.equal(false);
        });
    });

    describe('GraphQLUtilTest to test if schema is correctly created from file', () => {
        let schema;
        it('should return the schema as a GraphQLSchemaObject', () => {
            graphQLUtil
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
            graphQLUtil.createTypesFromSchema(schema);
            expect(graphQLUtil.enums.length).is.equals(1);
            expect(graphQLUtil.types.length).is.equals(6);
        });
    });
});
