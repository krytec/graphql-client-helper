import { FieldWrapper } from '../graphqlwrapper/FieldWrapper';
import * as vscode from 'vscode';
/**
 * CircularQuickInput class to create a quick input that provides input value for every argument
 */
export class CircularQuickInput {
    private _argumentGroup: ArgumentItem[];
    private _quickPick: vscode.QuickPick<ArgumentItem>;
    /**
     * Constructor for a CircularQuickInput
     * @param _titel Titel of the QuickInput
     * @param args Arguments
     */
    constructor(private _titel, private args: FieldWrapper[]) {
        this._argumentGroup = args.map(
            arg =>
                new ArgumentItem(
                    arg.name,
                    '',
                    arg.ofType,
                    arg.nonNull,
                    arg.description
                )
        );

        this._quickPick = vscode.window.createQuickPick();
        this._quickPick.items = this._argumentGroup;
        this._quickPick.buttons = [];
        this._quickPick.placeholder = `Please select an argument:`;
        this._quickPick.canSelectMany = false;
        this._quickPick.title = this._titel;
        this._quickPick.buttons = [new FilterArgumentButton('', 'Filter')];
        this._quickPick.onDidTriggerButton(button => {
            if (this._quickPick !== undefined) {
                this._quickPick.items = this._argumentGroup.filter(
                    item => item.nonNull === true
                );
            }
        });
    }

    /**
     * Create a QuickPick and returns it
     */
    private createQuickPick(): vscode.QuickPick<ArgumentItem> {
        const input = vscode.window.createQuickPick<ArgumentItem>();
        input.items = this._argumentGroup.sort((x, y) => {
            return x.isSet === y.isSet ? 0 : x.isSet ? 1 : -1;
        });
        input.placeholder = `Please select an argument:`;
        input.canSelectMany = false;
        input.title = this._titel;
        input.buttons = [new FilterArgumentButton('', 'Filter')];
        return input;
    }

    /**
     * Shows the current QuickPick and returns the current selected item as promise
     */
    private async showQuickPick(): Promise<ArgumentItem> {
        const disposables: vscode.Disposable[] = [];
        try {
            return await new Promise<ArgumentItem>((resolve, reject) => {
                if (this._quickPick) {
                    this._quickPick.dispose();
                }
                this._quickPick = this.createQuickPick();

                disposables.push(
                    this._quickPick.onDidChangeSelection(items =>
                        resolve(items[0])
                    ),
                    this._quickPick.onDidTriggerButton(button => {
                        if (this._quickPick !== undefined) {
                            this._quickPick.items.length ===
                            this._argumentGroup.length
                                ? (this._quickPick.items = this._argumentGroup.filter(
                                      item => item.nonNull === true
                                  ))
                                : (this._quickPick.items = this._argumentGroup);
                        }
                    })
                );
                this._quickPick.show();
            });
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
        let item = await this.showQuickPick();
        if (item !== undefined) {
            return new Promise<string>(async (resolve, reject) => {
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
                            return this.validateType(item, text)
                                ? null
                                : 'Invalid type for argument of type: ' +
                                      item.ofType;
                        }
                    })
                    .then(async value => {
                        if (value?.trim() === '' && item.nonNull === false) {
                            value = 'null';
                        }
                        if (value !== undefined) {
                            item.value = value;
                        } else {
                            resolve(this.show());
                        }
                        if (
                            this._argumentGroup.filter(
                                item =>
                                    item.isSet !== true && item.nonNull === true
                            ).length > 0
                        ) {
                            resolve(this.show());
                        } else {
                            this._argumentGroup.forEach(item => {
                                if (!item.isSet) {
                                    item.value = 'null';
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
                                    }
                                });
                            resolve(args);
                        }
                    });
            });
        } else {
            return Promise.reject();
        }
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
        }
        if (arg.nonNull) {
            return false;
        }
        return true;
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
        }
        return `"${arg.name}": "${arg.value}"`;
    }
}

/**
 * FilterArgumentButton class for QuickPick or Input
 */
class FilterArgumentButton implements vscode.QuickInputButton {
    constructor(
        public iconPath:
            | vscode.Uri
            | { light: vscode.Uri; dark: vscode.Uri }
            | vscode.ThemeIcon,
        public tooltip?: string | undefined
    ) {}
}

/**
 * ArgumentItem class that represents an argument as QuickPickItem
 */
class ArgumentItem implements vscode.QuickPickItem {
    constructor(
        private _key: string,
        private _value: string,
        private _ofType: string,
        private _nullable: boolean,
        public description?: string | undefined,
        detail?: string | undefined,
        picked?: boolean | undefined,
        alwaysShow?: boolean | undefined
    ) {}

    get label(): string {
        return `${this._key}: ${this._value}`;
    }

    get isSet(): boolean {
        if (this._value !== '' && this._value !== undefined) {
            return true;
        }
        return false;
    }

    get nonNull(): boolean {
        return this._nullable;
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

    set value(value: string) {
        this._value = value;
    }
}
