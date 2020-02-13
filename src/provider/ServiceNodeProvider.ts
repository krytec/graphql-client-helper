import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from './SavedRequestNodeProvider';
import { join } from 'path';

/**
 * Provider class which provides ServiceNodes as TreeItem for the service TreeView
 */
export class ServiceNodeProvider
    implements vscode.TreeDataProvider<ServiceNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        ServiceNode | undefined
    >();

    readonly onDidChangeTreeData: vscode.Event<ServiceNode | undefined> = this
        ._onDidChangeTreeData.event;

    constructor(private _state: StateService) {}

    /**
     * Refreshs the treeview
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Returns the selected element of the treeview
     * @param element Element which should be returned
     */
    getTreeItem(
        element: ServiceNode
    ): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Returns all elements of a treeview
     * @param element Parent element or undefined if its the root
     */
    getChildren(
        element?: ServiceNode | undefined
    ): vscode.ProviderResult<ServiceNode[]> {
        if (element) {
            return element.requests;
        } else {
            return this._state.services;
        }
    }
}

/**
 * ServiceNode class which extends TreeItem from vscode to represent a service as a TreeItem
 */
export class ServiceNode extends vscode.TreeItem {
    private _serviceRequests = new Array<ServiceNode>();
    constructor(
        public readonly label: string,
        private _tooltip: string,
        private _path: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue
    ) {
        super(label, collapsibleState);
    }

    //#region setter & getter
    get path(): string {
        return this._path;
    }

    get tooltip() {
        return this._tooltip;
    }

    get requests(): Array<ServiceNode> {
        return this._serviceRequests;
    }
    //#endregion

    /**
     * Adds a request to the service as ServiceNode
     * @param request Request which belongs to the service
     */
    addRequest(request: CustomRequest) {
        this._serviceRequests.push(
            new ServiceNode(
                request.label,
                request.tooltip,
                join(this._path, `${this.label}Requests.ts`),
                0,
                'serviceRequest'
            )
        );
    }
}
