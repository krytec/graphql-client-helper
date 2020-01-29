import * as vscode from 'vscode';
import { StateService } from './StateService';
import { QueryWrapper } from '../wrapper/GraphQLQueryWrapper';
import { FieldWrapper } from '../wrapper/GraphQLFieldWrapper';
import { MutationWrapper } from '../wrapper/GraphQLMutationWrapper';
import { TypeWrapper } from '../wrapper/GraphQLTypeWrapper';
import { maxQueryDepth } from '../constants';
import { dedent } from '../utils/Utils';

/**
 * RequestProvider for TreeView, fills the TreeView with data
 */
export class RequestNodeProvider implements vscode.TreeDataProvider<Request> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        Request | undefined
    >();

    readonly onDidChangeTreeData: vscode.Event<Request | undefined> = this
        ._onDidChangeTreeData.event;

    /**
     * Default constructor
     * @param stateService StateService which manages the state of the extension
     */
    constructor(private stateService: StateService) {}

    /**
     * Method to refresh the treeview
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Method to get an element of the tree
     * @param element Requested element
     */
    getTreeItem(element: Request): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Method to get all children of an treeviewitem
     * @param element the root element
     */
    getChildren(
        element?: Request | undefined
    ): vscode.ProviderResult<Request[]> {
        if (this.stateService.requests.length > 0) {
            if (element) {
                return Promise.resolve(element.fields);
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
        requests.forEach(
            request => (request.fields = this.getFields(request, 1))
        );
        return requests;
    }

    /**
     * Method to get possible child nodes of the tree element
     * @param request Parent node element of the tree
     */
    private getFields(request: Request, depth: number): Request[] {
        if (depth <= maxQueryDepth) {
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
                                    .map(
                                        enumType =>
                                            enumType.name === field.ofType
                                    )
                                    .includes(true)
                                    ? vscode.TreeItemCollapsibleState.None
                                    : vscode.TreeItemCollapsibleState.Collapsed,
                                undefined,
                                field.description
                            )
                    );
                requests.forEach(
                    request =>
                        (request.fields = this.getFields(request, depth + 1))
                );
                return requests;
            } else {
                return [];
            }
        } else {
            return [];
        }
    }
}

/**
 * Request class which represents a node in the treeview
 */
export class Request extends vscode.TreeItem {
    private _fields: Array<Request>;

    constructor(
        public readonly label: string,
        private _type: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        private _isQuery?: boolean,
        private _description?: string,
        public readonly command?: vscode.Command,
        private _isSelected: boolean = false
    ) {
        super(label, collapsibleState);
        if (collapsibleState !== 0) {
            this.contextValue = 'field';
        }
        if (_isQuery !== undefined) {
            this.contextValue = _isQuery ? 'query' : 'mutation';
            //this.label = _isQuery ? 'query ' + label : 'mutation ' + label;
        }
        this._fields = new Array<Request>();
    }

    /**
     * Method to return a request as a query string
     */
    toString(): string {
        const fields =
            this._fields.filter(field => field.selected === true).length > 0
                ? `{
            ${this._fields
                .map(field =>
                    field.selected ? dedent`\t ${field.toString()}` : ''
                )
                .join('\n')}
            }`
                : ``;

        return dedent`${this.label} ${fields}`;
    }

    //#region getter & setter
    get selected(): boolean {
        if (this.contextValue !== 'field') {
            return this._isSelected;
        } else {
            return this.collapsibleState === 2;
        }
    }

    set selected(selected: boolean) {
        this._isSelected = selected;
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

    get fields(): Array<Request> {
        return this._fields;
    }

    set fields(fields: Array<Request>) {
        this._fields = fields;
    }
    //#endregion
}
