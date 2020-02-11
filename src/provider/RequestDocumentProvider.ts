import * as vscode from 'vscode';

/**
 * Provider class that extends TextDocumentContentProvider to provide
 * a virtual document for request
 */
export class RequestDocumentProvider
    implements vscode.TextDocumentContentProvider {
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
        return uri.query;
    }
}
