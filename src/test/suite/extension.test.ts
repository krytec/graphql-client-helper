import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { expect } from 'chai';
//import * as extension from '../../extension';

describe('Extension Test', () => {
	vscode.window.showInformationMessage('Start all tests.');

	it('Sample test', () => {
		expect([1, 2, 3].indexOf(5)).to.equal(-1);
		expect([1,2,3].indexOf(0)).to.equal(-1);
	});
});
