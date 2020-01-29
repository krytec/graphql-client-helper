import * as vscode from 'vscode';
import { RequestNodeProvider, Request } from './RequestNodeProvider';
import { runInThisContext } from 'vm';
import { LoggingService } from './LoggingService';
import { StateService } from './StateService';

export class RequestService {
    private _treeView: vscode.TreeView<Request>;
    private _requestProvider: RequestNodeProvider;

    constructor(
        private stateService: StateService,
        private _logger: LoggingService
    ) {
        this._requestProvider = new RequestNodeProvider(stateService);
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

    private collapsedCallback(element: Request) {
        element.fields.filter(field => field.selected === true).length > 0
            ? (element.collapsibleState = 2)
            : (element.collapsibleState = 1);
    }

    private expandCallback(element: Request) {
        element.collapsibleState = 2;
    }
}
