import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { isValidURL } from '../../Utils/Utils';
import GraphQLUtils from '../../Utils/GraphQLUtils';
import { expect } from 'chai';


const fs = require("fs");
const path = require('path');
// import * as myExtension from '../extension';

describe('Util tests', function() {
	vscode.window.showInformationMessage('Start all tests.');
	describe('isValidURLTest to test if url is validated', () => {
        it('should return true', () => {
            expect(isValidURL('http://google.com')).to.equal(true);
        });

        it('should return true', () => {
            expect(isValidURL('https://google.com')).to.equal(true);
        });

        it('should return false', () => {
            expect(isValidURL('www.google.com')).to.equal(false);
        });

        it('should return false', () => {
            expect(isValidURL('google.com')).to.equal(false);
        });      
    });
    
    describe('GraphQLUtilTest to test if invalid endpoint throws error', () => {
        let url:string = 'http://google.com';
        let current_dir:string = path.join(__dirname, 'graphqlschema');
        let util = new GraphQLUtils(__dirname);
        it('should return true since the folder is created after creating instance of GraphQLUtils', () => {
            expect(fs.existsSync(current_dir)).to.equal(true);
        });
        it('should throw an error, response does not contain a body', async () => {       
            this.timeout(0);
            await util.getSchemaFromEndpoint(url).catch((err) => expect(err).to.be.instanceOf(Error));
        });     
        it('should return false, since the folder gets deleted if error is thrown', () => {
            expect(fs.existsSync(current_dir)).to.equal(false);
        });
    });
});