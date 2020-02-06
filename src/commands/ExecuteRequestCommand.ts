import { CustomRequest } from '../provider/SavedRequestNodeProvider';
import { ClientService } from '../services/ClientService';
import * as vscode from 'vscode';
import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';

/**
 * Executes a request with the internal graphqlclient,
 * provides user the option to insert a value for an argument
 * @param node The request that should be executed
 * @param client GraphQLClient
 */
export async function executeRequestCommand(
    node: CustomRequest,
    client: ClientService,
    channel: vscode.OutputChannel
) {
    channel.clear();
    let vars = '{';
    const steps = node.args.length;
    var count = 0;
    while (count < steps) {
        if (count !== 0) {
            vars += ',';
        }
        let arg = node.args[count];
        let value = await vscode.window.showInputBox({
            prompt: arg.nonNull
                ? 'Please provide a value for the required argument' +
                  arg.name +
                  '!'
                : 'Please provide a value for the optional argument ' +
                  arg.name,
            validateInput: text => {
                return validateType(arg, text)
                    ? null
                    : 'Invalid type for argument of type: ' + arg.ofType;
            }
        });

        if (value === undefined || value === '') {
            value = 'null';
        }
        vars = vars += argToString(arg, value);
        count++;
    }
    vars = vars += '}';
    client
        .executeRequest(node.request, JSON.parse(vars))
        .then(data => {
            channel.appendLine(data);
            channel.show();
        })
        .catch(error => vscode.window.showErrorMessage(error));
}

/**
 * Validates the inputvalue is of the right type
 * @param arg Argument
 * @param value Inputvalue for the argument
 */
function validateType(arg: FieldWrapper, value: string): boolean {
    if (value === undefined || value === '') {
        if (arg.nonNull === false) {
            return true;
        }
        return false;
    }
    if (arg.ofType === 'Boolean') {
        if (value.match(/^true|false/)) {
            return true;
        } else {
            return false;
        }
    } else if (arg.ofType === 'Int') {
        if (Number.parseInt(value) !== undefined) {
            return true;
        } else {
            return false;
        }
    } else if (arg.ofType === 'Float') {
        if (Number.parseFloat(value) !== undefined) {
            return true;
        } else {
            return false;
        }
    }
    if (arg.nonNull) {
        return false;
    }
    return true;
}

/**
 * Wraps an argument with its input as string
 * @param arg Argument
 * @param value Inputvalue
 */
function argToString(arg: FieldWrapper, value: string): string {
    if (value === 'null') {
        return `"${arg.name}": null`;
    }
    if (arg.ofType === 'Boolean') {
        return `"${arg.name}": ${value}`;
    } else if (arg.ofType === 'Int') {
        return `"${arg.name}": ${Number.parseInt(value)}`;
    } else if (arg.ofType === 'Float') {
        return `"${arg.name}": ${Number.parseFloat(value)}`;
    }
    return `"${arg.name}": "${value}"`;
}
