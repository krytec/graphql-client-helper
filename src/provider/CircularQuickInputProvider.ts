import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';
import * as vscode from 'vscode';
import { join } from 'path';
import { resolve } from 'dns';
import { StateService } from '../services/StateService';
import { getVSCodeDownloadUrl } from 'vscode-test/out/util';
import { isNull } from 'util';
/**
 * CircularQuickInput class to create a quick input that provides input value for every argument
 */
export class CircularQuickInput {
    private _argumentGroup: ArgumentItem[];
    private _currentArgumentGroup: ArgumentItem[];
    private _quickPick?: vscode.QuickPick<ArgumentItem>;
    private _buttons: vscode.QuickInputButton[];
    /**
     * Constructor for a CircularQuickInput
     * @param _titel Titel of the QuickInput
     * @param args Arguments
     */
    constructor(
        private _state: StateService,
        private _titel,
        private args: FieldWrapper[]
    ) {
        this._argumentGroup = args.map(arg => this.getArgumentItem(arg));
        this._currentArgumentGroup = this._argumentGroup;
        this._buttons = [
            new FilterArgumentButton('', 'Hide nullable arguments'),
            new RunRequestButton('', 'Run Request')
        ];
    }

    /**
     * Method to create an ArgumentItem out of a FieldWrapper
     * @param arg FieldWrapper to be presented as an ArgumentItem
     */
    private getArgumentItem(arg: FieldWrapper): ArgumentItem {
        var argItem = new ArgumentItem(
            arg.name,
            '',
            arg.ofType,
            arg.nonNull,
            arg.description
        );
        if (!arg.isScalar) {
            this._state.inputTypes.forEach(input => {
                if (input.name === arg.ofType) {
                    input.field.forEach(inputField => {
                        argItem.addField(this.getArgumentItem(inputField));
                    });
                }
            });
            this._state.enums.forEach(enums => {
                if (enums.name === arg.ofType) {
                    argItem.isEnum = true;
                    enums.values.forEach(val =>
                        argItem.addField(
                            new ArgumentItem(
                                val.name,
                                '',
                                'EnumValue',
                                argItem.nonNull,
                                enums.description
                            )
                        )
                    );
                }
            });
        }
        return argItem;
    }

    /**
     * Create a QuickPick and returns it
     */
    private createQuickPick(): vscode.QuickPick<ArgumentItem> {
        const input = vscode.window.createQuickPick<ArgumentItem>();
        input.items = this._currentArgumentGroup.sort((x, y) => {
            return x.isSet === y.isSet ? 0 : x.isSet ? 1 : -1;
        });
        input.placeholder = `Please select an argument:`;
        input.canSelectMany = false;
        input.title = this._titel;
        input.buttons = this._buttons;
        if (this._currentArgumentGroup !== this._argumentGroup) {
            input.buttons = this._buttons.concat(vscode.QuickInputButtons.Back);
        }
        return input;
    }

    /**
     * Shows the current QuickPick and returns the current selected item as promise
     */
    private async showQuickPick(): Promise<ArgumentItem | RunRequestButton> {
        const disposables: vscode.Disposable[] = [];
        try {
            return await new Promise<ArgumentItem | RunRequestButton>(
                (resolve, reject) => {
                    if (this._quickPick) {
                        this._quickPick.dispose();
                    }
                    this._quickPick = this.createQuickPick();

                    disposables.push(
                        this._quickPick.onDidChangeSelection(items =>
                            resolve(items[0])
                        ),
                        this._quickPick.onDidTriggerButton(button => {
                            if (button instanceof RunRequestButton) {
                                resolve(button);
                            } else if (button instanceof FilterArgumentButton) {
                                if (this._quickPick !== undefined) {
                                    if (
                                        this._quickPick.items.length ===
                                        this._currentArgumentGroup.length
                                    ) {
                                        this._quickPick.items = this._currentArgumentGroup.filter(
                                            item => item.nonNull === true
                                        );
                                        (button as FilterArgumentButton).switch();
                                        this._quickPick.buttons = this._buttons;
                                    } else {
                                        this._quickPick.items = this._currentArgumentGroup;
                                        (button as FilterArgumentButton).switch();
                                        this._quickPick.buttons = this._buttons;
                                    }
                                }
                            } else {
                                if (this._quickPick !== undefined) {
                                    this._quickPick.items = this._argumentGroup;
                                    this._quickPick.buttons = this._buttons;
                                }
                            }
                        })
                    );
                    this._quickPick.show();
                }
            );
        } finally {
            disposables.forEach(item => item.dispose());
        }
    }

    /**
     * Method to show the current QuickPick,
     * after an item is selected an inputbox is opened to provide the user the option
     * to provide an argument for the field
     *
     * If all requiered arguments are filled the user has the option to run the request
     */
    async show(): Promise<string> {
        let returnValue = await this.showQuickPick();
        if (returnValue instanceof ArgumentItem) {
            let item: ArgumentItem = returnValue;
            return new Promise<string>(async (resolve, reject) => {
                if (item.fields) {
                    this._currentArgumentGroup = item.fields;
                    resolve(this.show());
                } else if (item.ofType === 'EnumValue') {
                    this._currentArgumentGroup.forEach(
                        field => (field.value = '')
                    );
                    item.value = 'selected';
                    this._currentArgumentGroup = this._argumentGroup;
                    resolve(this.show());
                } else {
                    await vscode.window
                        .showInputBox({
                            placeHolder: item.value,
                            prompt: item.nonNull
                                ? 'Please provide a value for the required argument ' +
                                  item.name +
                                  '!'
                                : 'Please provide a value for the optional argument ' +
                                  item.name,
                            validateInput: text => {
                                return this.validateType(
                                    item as ArgumentItem,
                                    text
                                )
                                    ? null
                                    : 'Invalid type for argument of type: ' +
                                          item.ofType;
                            }
                        })
                        .then(async value => {
                            if (
                                value?.trim() === '' &&
                                item.nonNull === false
                            ) {
                                value = 'null';
                            }
                            if (value !== undefined) {
                                item.value = value;
                                //this._currentArgumentGroup = this._argumentGroup;
                                resolve(this.show());
                            } else {
                                //this._currentArgumentGroup = this._argumentGroup;
                                resolve(this.show());
                            }
                        });
                }
            });
        } else {
            return new Promise<string>(async (resolve, reject) => {
                const nonNullArgs = this._argumentGroup.filter(item =>
                    this.nonNullFilter(item)
                );
                if (nonNullArgs.length > 0) {
                    vscode.window.showErrorMessage(
                        `Non nullable argument(s) can't be null: ${nonNullArgs
                            .map(arg => arg.name)
                            .join(', ')}`
                    );
                    resolve(this.show());
                } else {
                    this._argumentGroup.forEach(item => {
                        if (!item.isSet) {
                            item.value = 'null';
                        } else {
                            if (item.fields && !item.isEnum) {
                                this.setArgumentsNull(item.fields);
                            }
                        }
                    });
                    const args =
                        '{' +
                        this._argumentGroup
                            .map(item => this.argToString(item))
                            .join(', ') +
                        '}';
                    await vscode.window
                        .showInformationMessage(
                            `Do you want to run request with arguments: ${args}?`,
                            'Yes',
                            'No'
                        )
                        .then(button => {
                            if (button === 'No') {
                                resolve(this.show());
                            } else if (button === 'Yes') {
                                resolve(args);
                            } else {
                                reject();
                            }
                        });
                    reject();
                }
            });
        }
    }

    /**
     * Filter method to check if an non nullable argument is null
     * @param argField Field that should be filtered
     */
    private nonNullFilter(argField: ArgumentItem) {
        if (argField.isSet) {
            if (argField.isEnum) {
                return false;
            }
            if (argField.fields) {
                return this.hasNullFields(argField.fields);
            } else {
                return false;
            }
        } else {
            if (argField.nonNull) {
                return true;
            }
            return false;
        }
    }

    /**
     * Method to check through the ArgumentItem list
     * and check if a field is set and still has non nullable values that are null
     * @param argItem ArgumentItem list
     */
    private hasNullFields(argItem: ArgumentItem[]) {
        let isNull = false;
        argItem.forEach(field => {
            if (field.isSet) {
                if (field.fields) {
                    isNull = isNull || this.hasNullFields(field.fields);
                } else {
                    isNull = false;
                }
            } else {
                if (field.nonNull) {
                    isNull = true;
                } else {
                    isNull = false;
                }
            }
        });
        return isNull;
    }

    /**
     * Method to set nullable arguments, that are not currently set to null
     * @param argItem ArgumentItems that should be potentionally set to null
     */
    private setArgumentsNull(argItem: ArgumentItem[]) {
        argItem.forEach(item => {
            if (item.fields && !item.isEnum) {
                this.setArgumentsNull(item.fields);
            } else {
                if (item.value.trim() === '') {
                    item.value = 'null';
                }
            }
        });
    }

    /**
     * Validates the inputvalue is of the right type
     * @param arg Argument
     * @param value Inputvalue for the argument
     */
    private validateType(arg: ArgumentItem, value: string): boolean {
        if (value === undefined || value === '') {
            if (arg.nonNull === false) {
                return true;
            }
            return false;
        }
        if (arg.ofType === 'Boolean') {
            if (value.match(/^true|false/)) {
                return true;
            } else {
                return false;
            }
        } else if (arg.ofType === 'Int') {
            var numb = Number.parseInt(value);
            if (!isNaN(numb)) {
                return true;
            } else {
                return false;
            }
        } else if (arg.ofType === 'Float') {
            var float = Number.parseFloat(value);
            if (!isNaN(float)) {
                return true;
            } else {
                return false;
            }
        } else if (arg.ofType === 'String') {
            return true;
        } else {
            if (arg.nonNull) {
                try {
                    JSON.parse(value);
                    return true;
                } catch (err) {
                    return false;
                }
            }
            return true;
        }
    }

    /**
     * Wraps an argument with its input as string
     * @param arg Argument
     * @param value Inputvalue
     */
    private argToString(arg: ArgumentItem): string {
        if (arg.value === 'null') {
            return `"${arg.name}": null`;
        }
        if (arg.ofType === 'Boolean') {
            return `"${arg.name}": ${arg.value}`;
        } else if (arg.ofType === 'Int') {
            return `"${arg.name}": ${Number.parseInt(arg.value)}`;
        } else if (arg.ofType === 'Float') {
            return `"${arg.name}": ${Number.parseFloat(arg.value)}`;
        } else if (arg.ofType === 'String') {
            return `"${arg.name}": "${arg.value}"`;
        } else if (arg.ofType === 'EnumValue') {
            if (arg.isSet) {
                return `"${arg.name}"`;
            } else {
                return '';
            }
        } else {
            if (arg.fields && !arg.isEnum) {
                arg.value =
                    '{' +
                    arg.fields
                        .map(field => this.argToString(field))
                        .join(', ') +
                    '}';
            } else if (arg.fields && arg.isEnum) {
                arg.value = arg.fields
                    .map(field => this.argToString(field))
                    .join('');
            }
            return `"${arg.name}": ${arg.value}`;
        }
    }
}

/**
 * FilterArgumentButton class for QuickPick or Input
 */
class FilterArgumentButton implements vscode.QuickInputButton {
    private isMax: boolean = true;
    constructor(
        public iconPath:
            | string
            | vscode.Uri
            | { light: vscode.Uri | string; dark: vscode.Uri | string }
            | vscode.ThemeIcon,
        public tooltip?: string | undefined
    ) {
        this.iconPath = {
            light: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'light',
                'minimize.svg'
            ),
            dark: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'dark',
                'minimize.svg'
            )
        };
    }

    public switch() {
        if (this.isMax) {
            this.iconPath = {
                light: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'light',
                    'maximize.svg'
                ),
                dark: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'dark',
                    'maximize.svg'
                )
            };
            this.tooltip = 'Show all arguments';
        } else {
            this.iconPath = {
                light: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'light',
                    'minimize.svg'
                ),
                dark: join(
                    __filename,
                    '..',
                    '..',
                    '..',
                    'resources',
                    'dark',
                    'minimize.svg'
                )
            };
            this.tooltip = 'Hide nullable arguments';
        }
        this.isMax = !this.isMax;
    }
}

/**
 * RunRequestButton class for QuickPick or Input
 */
class RunRequestButton implements vscode.QuickInputButton {
    constructor(
        public iconPath:
            | string
            | vscode.Uri
            | { light: vscode.Uri | string; dark: vscode.Uri | string }
            | vscode.ThemeIcon,
        public tooltip?: string | undefined
    ) {
        this.iconPath = {
            light: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'light',
                'play.svg'
            ),
            dark: join(
                __filename,
                '..',
                '..',
                '..',
                'resources',
                'dark',
                'play.svg'
            )
        };
    }
}

/**
 * ArgumentItem class that represents an argument as QuickPickItem
 */
class ArgumentItem implements vscode.QuickPickItem {
    private _fields?: Array<ArgumentItem>;
    private _isEnum: boolean = false;
    constructor(
        private _key: string,
        private _value: string,
        private _ofType: string,
        private _nonNull: boolean,
        public description?: string | undefined,
        detail?: string | undefined,
        picked?: boolean | undefined,
        alwaysShow?: boolean | undefined
    ) {}

    get label(): string {
        return `${this._key} ${
            this._value !== '' ? `: ${this._value}` : `- Type : ${this._ofType}`
        }`;
    }

    get isSet(): boolean {
        if (this._value !== '' && this._value !== undefined) {
            return true;
        } else if (this._fields) {
            let isFieldSet = false;
            this._fields.forEach(field => {
                if (field.isSet) {
                    isFieldSet = true;
                }
            });
            return isFieldSet;
        }
        return false;
    }

    get isEnum(): boolean {
        return this._isEnum;
    }

    set isEnum(value: boolean) {
        this._isEnum = value;
    }

    get nonNull(): boolean {
        return this._nonNull;
    }

    get name(): string {
        return this._key;
    }

    get ofType(): string {
        return this._ofType;
    }

    get value(): string {
        return this._value;
    }

    get fields(): Array<ArgumentItem> | undefined {
        return this._fields;
    }

    addField(field: ArgumentItem) {
        if (this._fields === undefined) {
            this._fields = new Array<ArgumentItem>();
        }
        this._fields.push(field);
    }

    set value(value: string) {
        this._value = value;
    }
}
