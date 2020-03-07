import * as vscode from 'vscode';
import { StateService } from '../services/StateService';
import { CustomRequest } from './CustomRequestNodeProvider';
import { join } from 'path';

/**
 * Provider class which provides ServiceNodes as TreeItem for the service TreeView
 */
export class ServiceNodeProvider implements vscode.TreeDataProvider<Service> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        Service | undefined
    >();

    readonly onDidChangeTreeData: vscode.Event<Service | undefined> = this
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
    getTreeItem(element: Service): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Returns all elements of a treeview
     * @param element Parent element or undefined if its the root
     */
    getChildren(
        element?: Service | undefined
    ): vscode.ProviderResult<Service[]> {
        if (element) {
            return element.requests;
        } else {
            return this._state.services;
        }
    }

    getParent(element: Service): vscode.ProviderResult<Service> {
        this._state.services.forEach(service => {
            if (service.requests.includes(element)) {
                return service;
            }
        });
        return element;
    }
}

/**
 * Service class which extends TreeItem from vscode to represent a service as a TreeItem
 */
export class Service extends vscode.TreeItem {
    private _serviceRequests = new Array<Service>();
    constructor(
        public readonly label: string,
        private _tooltip: string,
        private _path: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue,
        public readonly request?: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (this.command) {
            this.command.arguments = [this];
        }
    }

    //#region setter & getter
    get path(): string {
        return this._path;
    }

    get tooltip() {
        return this._tooltip;
    }

    get requests(): Array<Service> {
        return this._serviceRequests;
    }
    //#endregion

    /**
     * Adds a request to the service as ServiceNode
     * @param request Request which belongs to the service
     */
    addRequest(request: CustomRequest, customPath?: string) {
        if (customPath) {
            this._serviceRequests.push(
                new Service(
                    request.label,
                    request.tooltip,
                    customPath,
                    0,
                    'serviceRequest',
                    request.request
                )
            );
        } else {
            this._serviceRequests.push(
                new Service(
                    request.label,
                    request.tooltip,
                    join(this._path, `${this.label}Requests.ts`),
                    0,
                    'serviceRequest',
                    request.request
                )
            );
        }
    }
}
