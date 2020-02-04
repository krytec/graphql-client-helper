import * as vscode from 'vscode';
import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';
import { StateService } from '../services/StateService';
import { join } from 'path';

/**
 * SavedRequestNodeProvider which provides treedate of savedqueries
 */
export class SavedRequestNodeProvider
    implements vscode.TreeDataProvider<CustomRequest> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        CustomRequest | undefined
    >();

    readonly onDidChangeTreeData: vscode.Event<CustomRequest | undefined> = this
        ._onDidChangeTreeData.event;

    constructor(private _state: StateService) {}

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(
        element: CustomRequest
    ): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(
        element?: CustomRequest | undefined
    ): vscode.ProviderResult<any[]> {
        if (this._state.myRequests.length > 0) {
            return Promise.resolve(this._state.myRequests);
        } else {
            vscode.window.showErrorMessage(
                'Error: There are no saved requests yet.'
            );
        }
    }
}

/**
 * CustomRequest class which extends TreeItem to represent a custom request
 */
export class CustomRequest extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private _type: string,
        private _request: string,
        private _inputType: string,
        private _args: Array<FieldWrapper>,
        public readonly command?: vscode.Command,
        public collapsibleState: vscode.TreeItemCollapsibleState = 0,
        private _isSelected: boolean = false
    ) {
        super(label, collapsibleState);
        if (this.command) {
            this.command.arguments = [this];
        }
        this.iconPath = {
            light: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'light',
                'checkbox_unfilled.png'
            ),
            dark: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'dark',
                'checkbox_unfilled.png'
            )
        };
    }

    get selected(): boolean {
        return this._isSelected;
    }

    set selected(value: boolean) {
        if (value) {
            this.iconPath = {
                light: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'light',
                    'checkbox_filled.png'
                ),
                dark: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'dark',
                    'checkbox_filled.png'
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
                    'checkbox_unfilled.png'
                ),
                dark: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'dark',
                    'checkbox_unfilled.png'
                )
            };
        }
        this._isSelected = value;
    }

    get request(): string {
        return this._request;
    }

    get tooltip(): string {
        return this._type;
    }

    get args(): Array<FieldWrapper> {
        return this._args;
    }

    get inputType(): string {
        return this._inputType;
    }
}
