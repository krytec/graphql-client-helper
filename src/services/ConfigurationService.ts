import * as vscode from 'vscode';

/**
 * Configuration service class which manages the global extension configurations
 */
export class ConfigurationService {
    private _endpoint?: string;
    private _generatedFolder?: string;
    private _headers?: Array<String>;
    private _typescript?: boolean;

    // ! this boolean value is set for only trigger events when it is edited in the settings page, not by userinput
    private shouldTriggerEvent: boolean = true;

    //#region Events
    private _onDidChangeEndpoint: vscode.EventEmitter<
        string
    > = new vscode.EventEmitter<string>();
    public readonly onDidChangeEndpoint: vscode.Event<string> = this
        ._onDidChangeEndpoint.event;

    private _onDidChangeFolder: vscode.EventEmitter<
        string
    > = new vscode.EventEmitter<string>();
    public readonly onDidChangeFolder: vscode.Event<string> = this
        ._onDidChangeFolder.event;

    private _onDidChangeTypescript: vscode.EventEmitter<
        boolean
    > = new vscode.EventEmitter<boolean>();

    public readonly onDidChangeTypescript: vscode.Event<boolean> = this
        ._onDidChangeTypescript.event;
    //#endregion

    /**
     * Constructor for ConfigurationService,
     * get values from extension config
     */
    constructor() {
        this._endpoint = vscode.workspace
            .getConfiguration('graphix')
            .get('schema.endpoint') as string;
        this._generatedFolder = vscode.workspace
            .getConfiguration('graphix')
            .get('schema.folder') as string;
        this._typescript = vscode.workspace
            .getConfiguration('graphix')
            .get('typescript');
        vscode.workspace.onDidChangeConfiguration(e =>
            this.configurationChangedCallback(e)
        );
    }

    private configurationChangedCallback(
        event: vscode.ConfigurationChangeEvent
    ) {
        if (this.shouldTriggerEvent) {
            if (event.affectsConfiguration('graphix.schema.endpoint')) {
                this._endpoint = vscode.workspace
                    .getConfiguration('graphix')
                    .get('schema.endpoint') as string;
                this._onDidChangeEndpoint.fire(this.endpoint);
            } else if (event.affectsConfiguration('graphix.schema.folder')) {
                this._generatedFolder = vscode.workspace
                    .getConfiguration('graphix')
                    .get('schema.folder') as string;
                this._onDidChangeFolder.fire(this.generatedFolder);
            } else if (event.affectsConfiguration('graphix.typescript')) {
                this._typescript = vscode.workspace
                    .getConfiguration('graphix')
                    .get('typescript');
                this._onDidChangeTypescript.fire(this.typescript);
            }
            this.shouldTriggerEvent = true;
        }
    }

    //#region getter & setter
    set endpoint(value: string) {
        this.shouldTriggerEvent = false;
        vscode.workspace
            .getConfiguration('graphix')
            .update('schema.endpoint', value, true);
        this._endpoint = value;
    }

    set generatedFolder(value: string) {
        this.shouldTriggerEvent = false;
        vscode.workspace
            .getConfiguration('graphix')
            .update('schema.folder', value, true);
        this._generatedFolder = value;
    }

    set typescript(value: boolean) {
        this.shouldTriggerEvent = false;
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
        if (this._generatedFolder !== undefined) {
            return this._generatedFolder;
        } else {
            vscode.window.showErrorMessage(
                'Error: No generatedPath in config!'
            );
        }
        return '';
    }

    //#endregion
}
