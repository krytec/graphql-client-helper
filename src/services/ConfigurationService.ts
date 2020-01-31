import * as vscode from 'vscode';

/**
 * Configuration service class which manages the global extension configurations
 */
export class ConfigurationService {
    private _endpoint?: string;
    private _generatedPath?: string;
    private _headers?: Array<String>;
    private _typescript?: boolean;

    // ! TODO: Implement config change events and actually use it.
    private _onDidChangeEndpoint: vscode.EventEmitter<
        string
    > = new vscode.EventEmitter<string>();
    public readonly onDidChangeEndpoint: vscode.Event<string> = this
        ._onDidChangeEndpoint.event;

    /**
     * Constructor for ConfigurationService,
     * get values from extension config
     */
    constructor() {
        this._endpoint = vscode.workspace
            .getConfiguration('graphix')
            .get('schema.endpoint') as string;
        this._generatedPath = vscode.workspace
            .getConfiguration('graphix')
            .get('schema.folder') as string;

        this._typescript = vscode.workspace
            .getConfiguration('graphix')
            .get('typescript');
    }

    //#region getter & setter
    set endpoint(value: string) {
        vscode.workspace
            .getConfiguration('graphix')
            .update('schema.endpoint', value, true);
        this._endpoint = value;
    }

    set generatedFolder(value: string) {
        vscode.workspace
            .getConfiguration('graphix')
            .update('schema.folder', value, true);
        this._generatedPath = value;
    }

    set typescript(value: boolean) {
        vscode.workspace
            .getConfiguration('graphix')
            .update('schema.typescript', value, true);
        this._typescript = value;
    }

    get typescript(): boolean {
        if (this._typescript !== undefined) {
            return this._typescript;
        } else {
            return false;
        }
    }

    get endpoint(): string {
        if (this._endpoint !== undefined) {
            return this._endpoint;
        } else {
            vscode.window.showErrorMessage(
                'Error: No endpoint provided in config!'
            );
        }
        return '';
    }

    get generatedFolder(): string {
        if (this._generatedPath !== undefined) {
            return this._generatedPath;
        } else {
            vscode.window.showErrorMessage(
                'Error: No generatedPath in config!'
            );
        }
        return '';
    }

    //#endregion
}
