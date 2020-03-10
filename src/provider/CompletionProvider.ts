import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { Request } from './RequestNodeProvider';
import { lastEntryOfArray } from '../utils/Utils';
import { reactQueryFunctionTemplate } from '../templates/Reacttemplate';
/**
 * Request completion provider class to provide autocompletion for requests
 */
export class RequestCompletionProvider
    implements vscode.CompletionItemProvider {
    constructor(private _state: StateService) {}

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const items = new Array<vscode.CompletionItem>();
        let query = new vscode.CompletionItem(
            'query',
            vscode.CompletionItemKind.Function
        );
        query.insertText = 'query{}';
        let mutation = new vscode.CompletionItem(
            'mutation',
            vscode.CompletionItemKind.Function
        );
        mutation.insertText = 'mutation{}';
        const selection = document.getText(
            new vscode.Range(new vscode.Position(0, 0), position)
        );
        const lastQueryIdx = selection.lastIndexOf('query');
        const lastMutationIdx = selection.lastIndexOf('mutation');
        const lastRequestIdx = Math.max(lastQueryIdx, lastMutationIdx);
        let querySelected = true;
        if (lastRequestIdx < 0) {
            //nothing found
            items.push(query, mutation);
            return items;
        }
        if (lastQueryIdx < lastMutationIdx) {
            //mutation selected
            querySelected = false;
        }
        let lastRequestSelection = document.getText(
            new vscode.Range(document.positionAt(lastRequestIdx), position)
        );
        //check if query is already completed => curly brackets match each other
        if (this.checkBrackets(lastRequestSelection)) {
            items.push(query, mutation);
            return items;
        }

        //get all the fields of the query => queryName as first item
        const fields = lastRequestSelection.split('{');

        if (fields.length > 2) {
            let depth = fields.length;
            //get query name
            var queryName = fields[1]
                .split(' ')
                .join('')
                .split('\r')
                .join('')
                .split('\n')
                .join('')
                .split('(')[0];
            //check if query inside brackets is completed
            if (this.checkBrackets(lastRequestSelection.split(queryName)[1])) {
                return items;
            }
            var currentRequest: Request | undefined;
            this._state.currentTree.forEach(req => {
                if (req.query === querySelected) {
                    if (queryName === req.label) {
                        currentRequest = req;
                    }
                }
            });
            var curField: Request | undefined;
            var curSelection = '';
            let fieldName: string | string[] | undefined;
            while (depth > 2) {
                if (curField !== undefined) {
                    curField.fields.forEach(field => {
                        //get the current fieldName out of the field array
                        fieldName = lastEntryOfArray(
                            fields[fields.length + 2 - depth]
                                .split('\n')
                                .join('')
                                .split('\r')
                                .join('')
                                .trim()
                                .split(' ')
                        );

                        if (field.label === fieldName) {
                            if (field.fields.length > 0) {
                                var tempselection = this.getContentOfBrackets(
                                    curSelection.slice(
                                        curSelection.indexOf(field.label),
                                        curSelection.lastIndexOf('}') + 1
                                    )
                                );
                                if (!this.checkBrackets(tempselection)) {
                                    curField = field;
                                    curSelection = tempselection;
                                }
                            }
                        }
                    });
                    depth -= 1;
                } else if (currentRequest !== undefined) {
                    currentRequest.fields.forEach(field => {
                        //get current fieldName out of fields array
                        fieldName = lastEntryOfArray(
                            fields[fields.length + 2 - depth]
                                .split('\n')
                                .join('')
                                .split('\r')
                                .join('')
                                .trim()
                                .split(' ')
                        );

                        if (field.label === fieldName) {
                            if (curSelection === '') {
                                var tempselection = this.getContentOfBrackets(
                                    lastRequestSelection.slice(
                                        lastRequestSelection.indexOf(
                                            field.label
                                        ),
                                        lastRequestSelection.lastIndexOf('}') +
                                            1
                                    )
                                );
                                if (tempselection === '') {
                                    tempselection = lastRequestSelection.slice(
                                        lastRequestSelection.indexOf(
                                            field.label
                                        )
                                    );
                                }
                            } else {
                                tempselection = lastRequestSelection.slice(
                                    lastRequestSelection.indexOf(field.label)
                                );
                            }
                            if (tempselection !== '') {
                                if (!this.checkBrackets(tempselection)) {
                                    curField = field;
                                    curSelection = tempselection;
                                } else {
                                    // reduce the selection, fields that are already handled are cut of the string
                                    lastRequestSelection = lastRequestSelection
                                        .split(tempselection)
                                        .join('');
                                }
                            }
                            return;
                        }
                    });
                    depth -= 1;
                }
                //we reached the end
                if (depth === 2) {
                    //need to check some special cases with invalid input
                    //check the last field and get the name of the field as well as the content of the field
                    var lastField = lastRequestSelection.split('{');
                    var nameOfLastField = lastEntryOfArray(
                        lastField[lastField.length - 2]
                            .split('\n')
                            .join('')
                            .split('\r')
                            .join('')
                            .trim()
                            .split(' ')
                    );
                    var lastFieldBracketContent = this.getContentOfBrackets(
                        lastRequestSelection.slice(
                            lastRequestSelection.indexOf(
                                nameOfLastField as string
                            ),
                            lastRequestSelection.lastIndexOf('}') + 1
                        )
                    );

                    if (curField !== undefined && curField.fields.length > 0) {
                        //last field is neither current field, nor has it open brackets, nor is the name in names of the subfields
                        if (
                            curField.label !== nameOfLastField &&
                            !this.checkBrackets(lastFieldBracketContent) &&
                            !curField.fields
                                .map(field => field.label)
                                .includes(nameOfLastField as string)
                        ) {
                            return items;
                        }
                        curField.fields.forEach(field => {
                            let fieldItem = new vscode.CompletionItem(
                                field.label
                            );
                            fieldItem.insertText = `${field.toString()} ${
                                field.fields.length > 0 ? `{}` : ''
                            }`;
                            items.push(fieldItem);
                        });
                    } else {
                        //last field is neither the request it self, nor has it open brackets, nor is it in the names of the request fields
                        if (
                            lastField.length > 3 &&
                            !this.checkBrackets(lastFieldBracketContent) &&
                            !currentRequest?.fields
                                .map(field => field.label)
                                .includes(nameOfLastField as string)
                        ) {
                            return items;
                        }
                        if (!this.checkBrackets(lastRequestSelection)) {
                            currentRequest?.fields.forEach(field => {
                                let fieldItem = new vscode.CompletionItem(
                                    field.label
                                );
                                fieldItem.insertText = `${field.toString()} ${
                                    field.fields.length > 0 ? `{}` : ''
                                }`;
                                items.push(fieldItem);
                            });
                        } else {
                            items.push(query, mutation);
                        }
                    }
                }
            }
            return items;
        } else {
            this._state.currentTree.forEach(req => {
                if (req.query === querySelected) {
                    let reqItem = new vscode.CompletionItem(req.label);
                    reqItem.insertText = req.toString() + '{}';
                    items.push(reqItem);
                }
            });
            return items;
        }
    }

    /**
     * Private method to get content out of curly brackets
     * @param text String that contains content in curly brackets
     */
    private getContentOfBrackets(text: string): string {
        if (text.length === 0) {
            return '';
        }
        let stack = new Array<string>();
        for (let idx = 0; idx < text.length; idx++) {
            const char = text[idx];
            if (stack.length > 0) {
                if (char === '{') {
                    stack.push(char);
                } else if (char === '}') {
                    if (stack.length < 1) {
                        return '';
                    } else {
                        stack.pop();
                        if (stack.length === 0) {
                            return text.slice(0, idx + 1);
                        }
                    }
                }
            } else {
                if (char === '{') {
                    stack.push(char);
                }
            }
        }
        return text;
    }
    /**
     * Checks if the {} Brackets amount is balanced
     * @param text Text that should be checked if there is an equal amount of brackets
     */
    private checkBrackets(text: string): boolean {
        if (text.length === 0) {
            return false;
        }
        let stack = new Array<string>();
        for (let idx = 0; idx < text.length; idx++) {
            const char = text[idx];
            if (char === '{') {
                stack.push(char);
            } else if (char === '}') {
                if (stack.length < 1) {
                    return false;
                } else {
                    stack.pop();
                }
            }
        }
        return stack.length === 0;
    }
}
