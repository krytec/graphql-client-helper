import { StateService } from '../services/StateService';
import * as vscode from 'vscode';
import { validate, GraphQLError } from 'graphql';
import { stringToGraphQLObject, validateRequest } from '../utils/Utils';
import { GraphQLService } from '../services/GraphQLService';

/**
 * lineDecorator
 */
const lineDecorator = vscode.window.createTextEditorDecorationType({
    textDecoration: 'underline wavy lightcoral',
    fontStyle: 'italic',
    opacity: '75%',
    overviewRulerColor: 'red',
    overviewRulerLane: vscode.OverviewRulerLane.Full
});

/**
 * DecorationProvider class which provides decorations for queries and mutations
 * to validate the query while writing
 */
export class DecorationProvider {
    private _timeout: NodeJS.Timer | undefined = undefined;
    private _activeEditor = vscode.window.activeTextEditor;
    constructor(private _state: StateService) {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            return new Promise((resolve, rejects) => {
                this._activeEditor = editor;
                if (editor) {
                    this.triggerUpdateDecorations();
                }
            });
        }, null);

        vscode.workspace.onDidChangeTextDocument(event => {
            return new Promise((resolve, rejects) => {
                if (
                    this._activeEditor &&
                    event.document === this._activeEditor.document
                ) {
                    this.triggerUpdateDecorations();
                }
            });
        }, null);
    }

    /**
     * Updates the decorations if the active editor has a .gql file opened
     */
    private async updateDecorations() {
        if (!this._activeEditor) {
            return;
        }
        if (this._activeEditor.document.uri.fsPath.endsWith('.gql')) {
            const text = this._activeEditor.document.getText();
            this.checkRequests(text);
        }
    }

    /**
     * Validates all queries
     * @param text text of the current document
     */
    private async checkRequests(text: string) {
        const schema = this._state.schema;
        const bracketDecorations: vscode.DecorationOptions[] = [];
        const invalidFieldDecorations: vscode.DecorationOptions[] = [];
        let queryIdx = text.indexOf('query');
        let mutationIdx = text.indexOf('mutation');
        let idx: number = 0;
        if (queryIdx < 0) {
            idx = mutationIdx;
        } else if (mutationIdx < 0) {
            idx = queryIdx;
        } else {
            idx = queryIdx < mutationIdx ? queryIdx : mutationIdx;
        }
        if (this._activeEditor && schema) {
            while (idx > -1) {
                let content = this.getContentOfBrackets(text.slice(idx));
                if (!this.checkBrackets(content)) {
                    const startPos = this._activeEditor.document.positionAt(
                        idx
                    );
                    const endPos = this._activeEditor.document.positionAt(
                        idx + content.length
                    );
                    const decoration = {
                        range: new vscode.Range(startPos, endPos),
                        hoverMessage: 'Missing }'
                    };
                    bracketDecorations.push(decoration);
                }
                try {
                    let validationArray = validateRequest(schema, content);
                    if (validationArray.length > 0) {
                        validationArray.forEach(error => {
                            if (error.nodes) {
                                error.nodes.forEach(node => {
                                    if (this._activeEditor && node.loc) {
                                        const startPos = this._activeEditor.document.positionAt(
                                            idx + node.loc.start
                                        );
                                        const endPos = this._activeEditor.document.positionAt(
                                            idx + node.loc.end
                                        );
                                        const decoration = {
                                            range: new vscode.Range(
                                                startPos,
                                                endPos
                                            ),
                                            hoverMessage: error.message
                                        };
                                        invalidFieldDecorations.push(
                                            decoration
                                        );
                                    }
                                });
                            }
                        });
                    }
                } catch (error) {
                    if (error.positions) {
                        error.positions.forEach(pos => {
                            if (this._activeEditor) {
                                const startPos = this._activeEditor.document.positionAt(
                                    idx + pos
                                );
                                const endPos = startPos.with(
                                    startPos.line,
                                    this._activeEditor.document.lineAt(
                                        startPos.line
                                    ).text.length
                                );
                                const decoration = {
                                    range: new vscode.Range(
                                        startPos.with(undefined, 0),
                                        endPos
                                    ),
                                    hoverMessage: error.message
                                };
                                invalidFieldDecorations.push(decoration);
                            }
                        });
                    }
                }
                queryIdx = text.indexOf('query', idx + 1);
                mutationIdx = text.indexOf('mutation', idx + 1);
                if (queryIdx < 0 && mutationIdx < 0) {
                    break;
                }
                if (queryIdx < 0) {
                    idx = mutationIdx;
                } else if (mutationIdx < 0) {
                    idx = queryIdx;
                } else {
                    idx = queryIdx < mutationIdx ? queryIdx : mutationIdx;
                }
            }
            this._activeEditor.setDecorations(
                lineDecorator,
                bracketDecorations
            );
            this._activeEditor.setDecorations(
                lineDecorator,
                invalidFieldDecorations
            );
        }
    }

    /**
     * Triggers the decorator to update the decorations -> every 500ms
     */
    private async triggerUpdateDecorations() {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = undefined;
        }
        this._timeout = setTimeout(() => this.updateDecorations(), 500);
    }

    /**
     * Private method to get content out of curly brackets
     * @param text String that contains content in curly brackets
     */
    private getContentOfBrackets(text: string): string {
        if (text.length === 0) {
            return '';
        }
        let start = 0;
        let stack = new Array<string>();
        for (let idx = 0; idx < text.length; idx++) {
            const char = text[idx];
            if (stack.length > 0) {
                if (char === '{') {
                    stack.push(char);
                } else if (char === '}') {
                    if (stack.length < 1) {
                        return text.slice(start, idx + 1);
                    } else {
                        stack.pop();
                        if (stack.length === 0) {
                            return text.slice(0, idx + 1);
                        }
                    }
                }
            } else {
                if (char === '{') {
                    start = idx;
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
