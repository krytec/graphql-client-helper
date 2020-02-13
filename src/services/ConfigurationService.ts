import * as vscode from 'vscode';
import { toFramework } from '../utils/Utils';

export const enum Framework {
    NONE = 0,
    ANGULAR = 1,
    REACT = 2
}

/**
 * Configuration service class which manages the global extension configurations
 */
export class ConfigurationService {
    private _endpoint?: string;
    private _generatedFolder?: string;
    private _headers?: Array<object>;
    private _framework?: Framework;
    private _typescript?: boolean;

    // ! This boolean value is set for only trigger events when it is edited in the settings page, not by userinput
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

    private _onDidChangeFramework: vscode.EventEmitter<
        Framework
    > = new vscode.EventEmitter<Framework>();

    public readonly onDidChangeFramework: vscode.Event<Framework> = this
        ._onDidChangeFramework.event;

    private _onDidChangeHeaders: vscode.EventEmitter<
        Array<object>
    > = new vscode.EventEmitter<Array<object>>();

    public readonly onDidChangeHeaders: vscode.Event<Array<object>> = this
        ._onDidChangeHeaders.event;
    //#endregion

    /**
     * Constructor for ConfigurationService,
     * get values from extension config
     */
    constructor() {
        this._endpoint = vscode.workspace
            .getConfiguration('graphax')
            .get('schema.endpoint') as string;
        this._generatedFolder = vscode.workspace
            .getConfiguration('graphax')
            .get('schema.folder') as string;
        this._typescript = vscode.workspace
            .getConfiguration('graphax')
            .get('typescript');
        this._framework = toFramework(
            vscode.workspace
                .getConfiguration('graphax')
                .get('service.framework') as string
        );
        this._headers = vscode.workspace.getConfiguration('graphax').get('client.headers') as Array<object>;
        vscode.workspace.onDidChangeConfiguration(e =>
            this.configurationChangedCallback(e)
        );
    }
    private configurationChangedCallback(
        event: vscode.ConfigurationChangeEvent
    ) {
        if (this.shouldTriggerEvent) {
            if (event.affectsConfiguration('graphax.schema.endpoint')) {
                this._endpoint = vscode.workspace
                    .getConfiguration('graphax')
                    .get('schema.endpoint') as string;
                this._onDidChangeEndpoint.fire(this.endpoint);
            } else if (event.affectsConfiguration('graphax.schema.folder')) {
                this._generatedFolder = vscode.workspace
                    .getConfiguration('graphax')
                    .get('schema.folder') as string;
                this._onDidChangeFolder.fire(this.generatedFolder);
            } else if (event.affectsConfiguration('graphax.typescript')) {
                this._typescript = vscode.workspace
                    .getConfiguration('graphax')
                    .get('typescript');
                this._onDidChangeTypescript.fire(this.typescript);
            } else if (
                event.affectsConfiguration('graphax.service.framework')
            ) {
                this._framework = toFramework(
                    vscode.workspace
                        .getConfiguration('graphax')
                        .get('service.framework') as string
                );
                this._onDidChangeFramework.fire(this.framework);
            } else if(
                event.affectsConfiguration('graphax.client.headers')){
                    this._headers = vscode.workspace.getConfiguration('graphax').get('client.headers') as Array<object>;
                    this._onDidChangeHeaders.fire(this.headers);
                }
        } else {
            if (event.affectsConfiguration('graphax.schema.endpoint')) {
                this._endpoint = vscode.workspace
                    .getConfiguration('graphax')
                    .get('schema.endpoint') as string;
            } else if (event.affectsConfiguration('graphax.schema.folder')) {
                this._generatedFolder = vscode.workspace
                    .getConfiguration('graphax')
                    .get('schema.folder') as string;
            } else if (event.affectsConfiguration('graphax.typescript')) {
                this._typescript = vscode.workspace
                    .getConfiguration('graphax')
                    .get('typescript');
            }
            this.shouldTriggerEvent = true;
        }
    }

    //#region getter & setter
    set endpoint(value: string) {
        this.shouldTriggerEvent = false;
        vscode.workspace
            .getConfiguration('graphax')
            .update('schema.endpoint', value, true);
        this._endpoint = value;
    }

    set generatedFolder(value: string) {
        this.shouldTriggerEvent = false;
        vscode.workspace
            .getConfiguration('graphax')
            .update('schema.folder', value, true);
        this._generatedFolder = value;
    }

    set typescript(value: boolean) {
        this.shouldTriggerEvent = false;
        vscode.workspace
            .getConfiguration('graphax')
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

    get framework(): Framework {
        if (this._framework !== undefined) {
            return this._framework;
        }
        //Default
        return Framework.ANGULAR;
    }

    get headers(): Array<object> {
        if(this._headers){
            return this._headers;
        }else{
            return [];
        }
    }

    //#endregion
}
