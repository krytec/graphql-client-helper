import { StateService } from '../services/StateService';
import * as vscode from 'vscode';

export class DecorationProvider {
    private _timeout: NodeJS.Timer | undefined = undefined;
    private _activeEditor = vscode.window.activeTextEditor;

    constructor(private _state: StateService) {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            this._activeEditor = editor;
            if (editor) {
                this.triggerUpdateDecorations();
            }
        }, null);

        vscode.workspace.onDidChangeTextDocument(event => {
            if (
                this._activeEditor &&
                event.document === this._activeEditor.document
            ) {
                this.triggerUpdateDecorations();
            }
        }, null);

        this.triggerUpdateDecorations();
    }

    private async updateDecorations() {
        return new Promise((resolve, reject) => {
            if (!this._activeEditor) {
                return;
            }
            if (this._activeEditor.document.uri.fsPath.endsWith('.gql')) {
                const text = this._activeEditor.document.getText();
                this.checkQueries(text);
                this.checkMutations(text);
            }
            resolve(true);
        });
    }

    private checkQueries(text: string) {
        let idx: number = text.indexOf('query');
        while (idx > -1) {
            let content = this.getContentOfBrackets(text.slice(idx));
            console.log(content);
            idx = text.indexOf('query', idx);
        }
    }

    private checkMutations(text: string) {
        throw new Error('NYI');
    }

    private async triggerUpdateDecorations() {
        return new Promise((resolve, reject) => {
            if (this._timeout) {
                clearTimeout(this._timeout);
                this._timeout = undefined;
            }
            this._timeout = setTimeout(() => this.updateDecorations(), 500);
        });
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
                            return text.slice(start, idx + 1);
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
