import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { isValidURL } from '../../Utils/Utils';
import { expect } from 'chai';

const fs = require('fs');
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
});
