import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { QueryWrapper } from '../graphqlwrapper/QueryWrapper';
import { maxQueryDepth } from '../constants';
import { dedent } from '../utils/Utils';
import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';
import { join } from 'path';

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
        if (this.stateService.currentTree.length > 0) {
            if (element) {
                return Promise.resolve(element.fields);
            } else {
                return Promise.resolve(this.stateService.currentTree);
            }
        } else if (this.stateService.requests.length > 0) {
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
        const requests = this.stateService.requests.map(request => {
            let node = new Request(
                request.Name,
                request.Type,
                request.returnsList,
                vscode.TreeItemCollapsibleState.Collapsed,
                request instanceof QueryWrapper,
                request.Description
            );
            request.args.forEach(arg => node.addArgument(arg));
            return node;
        });
        requests.forEach(
            request => (request.fields = this.getFields(request, 1))
        );
        this.stateService.currentTree = requests;
        return requests;
    }

    /**
     * Method to get all possible child nodes of the tree element,
     * until the maxQueryDepth is reached
     * @param request Parent node element of the tree
     * @param depth Current depth of the request
     */
    private getFields(request: Request, depth: number): Request[] {
        if (depth <= maxQueryDepth) {
            const type = this.stateService.types.find(
                type => request.type === type.name
            );

            if (type !== undefined) {
                const requests = type.getFields().map(field => {
                    var collapsibleState =
                        this.stateService.scalar.fields
                            .map(scalar => scalar.name === field.ofType)
                            .includes(true) ||
                        this.stateService.enums
                            .map(enumType => enumType.name === field.ofType)
                            .includes(true)
                            ? vscode.TreeItemCollapsibleState.None
                            : vscode.TreeItemCollapsibleState.Collapsed;
                    var req = new Request(
                        field.name,
                        field.ofType,
                        field.isList,
                        collapsibleState,
                        undefined,
                        field.description,
                        collapsibleState === 0
                            ? { command: 'tree.selectField', title: 'Select' }
                            : undefined
                    );
                    field.args.forEach(arg => {
                        req.addArgument(arg);
                    });
                    return req;
                });
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
    private _args: Array<FieldWrapper> = new Array<FieldWrapper>();

    /**
     * Constructor for a request
     * @param label Label of the item
     * @param _type Type that is returned by the field
     * @param collapsibleState Shows if item is collapsed
     * @param _isQuery Identifies if the item is a query root
     * @param _description Optional description of an item
     * @param command Optional command of an item
     * @param _isSelected Checks if the current item is selected
     */

    constructor(
        public readonly label: string,
        private _type: string,
        private _isList: boolean,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        private _isQuery?: boolean,
        private _description?: string,
        public readonly command?: vscode.Command,
        private _deprecated: boolean = false,
        private _isSelected: boolean = false
    ) {
        super(label, collapsibleState);
        if (collapsibleState === 0) {
            this.contextValue = 'field';
            this.iconPath = {
                light: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'light',
                    'checkbox_unfilled.svg'
                ),
                dark: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'dark',
                    'checkbox_unfilled.svg'
                )
            };
        }
        if (_isQuery !== undefined) {
            this.contextValue = _isQuery ? 'query' : 'mutation';
        }
        if (this.command) {
            this.command.arguments = [this];
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
                .map(field => (field.selected ? `\t ${field.toString()}` : ''))
                .join('\n')}
            }`
                : ``;
        const args = this._args
            .map(ele => `${ele.name}:$${ele.name}`)
            .join(' ');
        return `${this.label} ${
            this._args.length > 0 ? `(${args})` : ``
        } ${fields}`;
    }

    deselect() {
        this.selected = false;
        this._fields.forEach(element => {
            element.deselect();
        });
    }

    /**
     * Adds an argument to a request
     * @param argument Argument of a request
     */
    addArgument(argument: FieldWrapper) {
        this._args.push(argument);
    }

    //#region getter & setter
    get selected(): boolean {
        if (this.contextValue === 'field') {
            return this._isSelected;
        } else {
            return this.fields.map(field => field.selected).includes(true);
        }
    }

    set selected(selected: boolean) {
        if (this.collapsibleState === 0) {
            if (selected) {
                this.iconPath = {
                    light: join(
                        __filename,
                        '..',
                        '..',
                        '..',
                        'resources',
                        'light',
                        'checkbox_filled.svg'
                    ),
                    dark: join(
                        __filename,
                        '..',
                        '..',
                        '..',
                        'resources',
                        'dark',
                        'checkbox_filled.svg'
                    )
                };
            } else {
                this.iconPath = {
                    light: join(
                        __filename,
                        '..',
                        '..',
                        '..',
                        'resources',
                        'light',
                        'checkbox_unfilled.svg'
                    ),
                    dark: join(
                        __filename,
                        '..',
                        '..',
                        '..',
                        'resources',
                        'dark',
                        'checkbox_unfilled.svg'
                    )
                };
            }
        }
        this._isSelected = selected;
    }

    get selectedRequest(): Request {
        return this;
    }

    get args(): Array<FieldWrapper> {
        return this._args;
    }
    get tooltip(): string {
        return `Type : ${this._isList ? `[${this._type}]` : `${this._type}`}`;
    }

    get type(): string {
        return this._type;
    }

    get returnsList(): boolean {
        return this._isList;
    }

    get query(): boolean {
        if (this._isQuery !== undefined) {
            return this._isQuery;
        }
        return false;
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

    get deprecated(): boolean {
        return this._deprecated;
    }

    set fields(fields: Array<Request>) {
        this._fields = fields;
    }
    //#endregion
}
