import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { isValidURL } from '../../Utils/Utils';
import GraphQLUtils from '../../Utils/GraphQLUtils';

const fs = require("fs");
const path = require('path');
// import * as myExtension from '../extension';

suite('Util Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('isValidURLTest', () => {
        assert.equal(true, isValidURL('http://google.com'));
        assert.equal(true, isValidURL('https://google.com'));
		assert.equal(false, isValidURL('www.google.com'));
        assert.equal(false, isValidURL('google.com'));
        assert.equal(false, isValidURL('http.google.com'));
        assert.equal(false, isValidURL('ww.google.com'));
        assert.equal(false, isValidURL('test/google.com'));
    });
    
    test('GraphQLUtilTest', async () => {
        let util = new GraphQLUtils(__dirname);
        assert.equal(true, fs.existsSync(path.join(__dirname, 'graphqlschema')));
        assert.throws(await util.getSchemaFromEndpoint('http://google.com'), Error);
        assert.equal(false, fs.existsSync(path.join(__dirname, 'graphqlschema')));
    });
});