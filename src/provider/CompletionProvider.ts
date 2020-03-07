import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
export class CompletionProvider implements vscode.CompletionItemProvider {
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
        items.push(query, mutation);
        let linePrefix = document
            .lineAt(position)
            .text.substr(0, position.character);
        if (
            !linePrefix
                .split(' ')
                .join('')
                .endsWith('query{')
        ) {
            return items;
        } else {
            this._state.currentTree.forEach(req => {
                if (req.query) {
                    let reqItem = new vscode.CompletionItem(req.label);
                    reqItem.insertText = req.toString() + '{}';
                    items.push(reqItem);
                }
            });
        }
        return items;
    }
}
