import * as vscode from 'vscode';
import { StateService } from './StateService';
import { QueryWrapper } from '../wrapper/GraphQLQueryWrapper';
import { FieldWrapper } from '../wrapper/GraphQLFieldWrapper';
import { MutationWrapper } from '../wrapper/GraphQLMutationWrapper';

/**
 * RequestProvider for TreeView, fills the TreeView with data
 */
export class RequestNodeProvider implements vscode.TreeDataProvider<Request> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        Request | undefined
    >();

    readonly onDidChangeTreeData: vscode.Event<Request | undefined> = this
        ._onDidChangeTreeData.event;

    constructor(private stateService: StateService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Request): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(
        element?: Request | undefined
    ): vscode.ProviderResult<Request[]> {
        const queries = this.stateService.queries;
        const mutations = this.stateService.mutations;
        if (queries.length > 0 && mutations.length > 0) {
            if (element) {
            } else {
            }
        } else {
            vscode.window.showInformationMessage(
                'Schema did not provide any requests'
            );
            return Promise.resolve([]);
        }
    }

    private getFields(field: FieldWrapper) {}
}

/**
 * Request class which represents a node in the treeview
 */
class Request extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private _description: string,
        private _queryField: QueryWrapper | FieldWrapper | MutationWrapper,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        _queryField instanceof FieldWrapper
            ? (this.contextValue = 'field')
            : _queryField instanceof FieldWrapper
            ? (this.contextValue = 'query')
            : (this.contextValue = 'mutation');
    }

    get tooltip(): string {
        return this._description;
    }

    get description(): string {
        return this._description;
    }
}
