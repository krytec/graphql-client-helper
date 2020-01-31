import * as vscode from 'vscode';
import { RequestNodeProvider, Request } from '../provider/RequestNodeProvider';
import { runInThisContext } from 'vm';
import { LoggingService } from './LoggingService';
import { StateService } from './StateService';

/**
 * Service to create a treeview of the available requests
 */
export class RequestService {
    private _treeView: vscode.TreeView<Request>;

    constructor(private _requestProvider: RequestNodeProvider) {
        this._treeView = vscode.window.createTreeView('schemaExplorer', {
            treeDataProvider: this._requestProvider
        });

        this._treeView.onDidCollapseElement(event =>
            this.collapsedCallback(event.element)
        );
        this._treeView.onDidExpandElement(event =>
            this.expandCallback(event.element)
        );
    }

    /**
     * Callback method to change the values of the collapsible state programmatically,
     * since it doesnt work otherwise
     * @param element Element which should be collapsed
     */
    private collapsedCallback(element: Request) {
        element.fields.filter(field => field.selected === true).length > 0
            ? (element.collapsibleState = 2)
            : (element.collapsibleState = 1);
    }

    /**
     * Callback method to change the values of the collapsible state programmatically,
     * since it doesnt work otherwise
     * @param element Element which should be expanded
     */
    private expandCallback(element: Request) {
        element.collapsibleState = 2;
    }
}
