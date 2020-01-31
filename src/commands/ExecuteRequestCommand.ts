import { CustomRequest } from '../services/SavedRequestNodeProvider';
import { ClientService } from '../services/ClientService';
import * as vscode from 'vscode';
import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';

export async function executeRequestCommand(
    node: CustomRequest,
    client: ClientService
) {
    let vars = '{';
    const steps = node.args.length;
    var count = 0;
    while (count < steps) {
        if (count !== 0) {
            vars += ',';
        }
        let arg = node.args[count];
        const value = await vscode.window.showInputBox({
            prompt: arg.nonNull
                ? 'Input for ' + arg.name + ' is required!'
                : 'Input for ' + arg.name + ' can be null',
            validateInput: text => {
                return validateType(arg, text)
                    ? null
                    : 'Invalid type for argument of type: ' + arg.ofType;
            }
        });

        if (value !== undefined) {
            vars = vars += argToString(arg, value);
        }

        count++;
    }
    vars = vars += '}';
    client.executeRequest(node.request, JSON.parse(vars));
}

/**
 * Validates the inputvalue is of the right type
 * @param arg Argument
 * @param value Inputvalue for the argument
 */
function validateType(arg: FieldWrapper, value: string): boolean {
    if (value === undefined || value === '') {
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
    return true;
}

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
