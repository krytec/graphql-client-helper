import { URL } from 'url';
import {
    print,
    parse,
    DocumentNode,
    typeFromAST,
    GraphQLSchema,
    validate
} from 'graphql';
import { Framework } from '../services/ConfigurationService';
import * as vscode from 'vscode';

/**
 * * Function to validate a given url as string
 * @param value
 */
export function isValidURL(value: string): boolean {
    try {
        const url = new URL(value);
        return true;
    } catch (TypeError) {
        return false;
    }
}

/**
 * Sleep function to sleep for ms miliseconds
 * @param ms Miliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns the last entry of an array
 * @param array array that should be checked
 * @param n number of entries that are returned
 */
export function lastEntryOfArray<T>(array: Array<T>, n?: number) {
    if (array === null) {
        return void 0;
    }
    if (n === undefined) {
        return array[array.length - 1];
    }
    return array.slice(Math.max(array.length - n, 0));
}

/**
 * * Function to parse a string to graphql and return it as string
 * @param request Input string to pars
 */
export function stringToGraphQLFormat(request: string): string {
    return print(parse(request));
}

/**
 * Function to create a graphqlobject from graphql.js from a request given as string
 * @param request request as string
 */
export function stringToGraphQLObject(request: string): DocumentNode {
    return parse(request);
}

/**
 * Validates a given request as string to the given graphqlschema
 * @param schema GraphQLSchema Object from graphql.js
 * @param request Request as string
 */
export function validateRequest(schema: GraphQLSchema, request: string) {
    if (schema) {
        let validation = validate(schema, stringToGraphQLObject(request));
        return validation;
    } else {
        throw new Error('No schema loaded');
    }
}

/**
 * !Function to dedent multiline strings from https://gist.github.com/zenparsing/5dffde82d9acef19e43c
 */
export function dedent(callSite, ...args) {
    function format(str) {
        let size = -1;

        return str.replace(/\n(\s+)/g, (m, m1) => {
            if (size < 0) {
                size = m1.replace(/\t/g, '    ').length;
            }
            return '\n' + m1.slice(Math.min(m1.length, size));
        });
    }

    if (typeof callSite === 'string') {
        return format(callSite);
    }
    if (typeof callSite === 'function') {
        return (...args) => format(callSite(...args));
    }
    let output = callSite
        .slice(0, args.length + 1)
        .map((text, i) => (i === 0 ? '' : args[i - 1]) + text)
        .join('');

    return format(output);
}

/**
 * Function to return a given string in title case
 * @param str Input string
 */
export function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Function to cast a string to the correct enum value
 * @param framework enum value as string
 */
export function toFramework(framework: string): Framework {
    switch (framework) {
        case 'ANGULAR':
            return Framework.ANGULAR;
        case 'REACT':
            return Framework.REACT;
        default:
            return Framework.NONE;
    }
}

/**
 * Function to select a range from a vscode.TextDocument from textStart to textEnd
 * @param doc vscode.TextDocument
 * @param textStart Start string
 * @param textEnd End string
 */
export function getTextRange(
    doc: vscode.TextDocument,
    textStart: string,
    textEnd: string
): vscode.Range {
    let start = 0;
    let startChar = 0;
    let end = 0;
    let endChar = 0;
    for (let index = 0; index < doc.lineCount; index++) {
        const text = doc.lineAt(index).text;
        if (text.includes(textStart)) {
            start = index;
            startChar = text.indexOf(textStart);
        } else if (start !== 0) {
            if (text.includes(textEnd)) {
                end = index;
                endChar = text.length;
                break;
            }
        }
    }
    return new vscode.Range(
        new vscode.Position(start, startChar),
        new vscode.Position(end, endChar)
    );
}
