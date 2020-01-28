import * as vscode from 'vscode';
import { StateService } from './StateService';
import { QueryWrapper } from '../wrapper/GraphQLQueryWrapper';
import { FieldWrapper } from '../wrapper/GraphQLFieldWrapper';
import { MutationWrapper } from '../wrapper/GraphQLMutationWrapper';
import { TypeWrapper } from '../wrapper/GraphQLTypeWrapper';

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
        if (this.stateService.requests.length > 0) {
            if (element) {
                //! TODO: Add child elements based on query / mutation
                return Promise.resolve(this.getFields(element));
            } else {
                return Promise.resolve(this.getRequests());
            }
        } else {
            vscode.window.showInformationMessage(
                'Schema did not provide any requests'
            );
            return Promise.resolve([]);
        }
    }
    /**
     * Method to get all Mutations and Queries at the first layer of the tree
     */
    private getRequests(): Request[] {
        const requests = this.stateService.requests.map(
            request =>
                new Request(
                    request.Name,
                    request.Type,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    request instanceof QueryWrapper,
                    request.Description
                )
        );
        return requests;
    }

    /**
     * Method to get possible child nodes of the tree element
     * @param request Parent node element of the tree
     */
    private getFields(request: Request): Request[] {
        const type = this.stateService.types.find(
            type => request.type === type.name
        );

        if (type !== undefined) {
            const requests = type
                .getFields()
                .map(
                    field =>
                        new Request(
                            field.name,
                            field.ofType,
                            this.stateService.scalar.fields
                                .map(scalar => scalar.name === field.ofType)
                                .includes(true) ||
                            this.stateService.enums
                                .map(enumType => enumType.name === field.ofType)
                                .includes(true)
                                ? vscode.TreeItemCollapsibleState.None
                                : vscode.TreeItemCollapsibleState.Collapsed,
                            undefined,
                            field.description
                        )
                );

            return requests;
        } else {
            return [];
        }
    }
}

/**
 * Request class which represents a node in the treeview
 */
class Request extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private _type: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private _isQuery?: boolean,
        private _description?: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }

    get tooltip(): string {
        return `Type : ${this.type}`;
    }

    get type(): string {
        return this._type;
    }

    get description(): string {
        if (this._description !== undefined) {
            return this._description;
        }
        return '';
    }
}
