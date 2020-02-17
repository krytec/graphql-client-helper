import { window } from 'vscode';

type LOG_LEVEL = 'WARN' | 'INFO' | 'DEBUG';

/**
 * LoggingService for the extension
 */
export class LoggingService {
    private outputChannel = window.createOutputChannel('GraphaX Log');

    constructor() {}

    /**
     * Method to log a message as info
     * @param msg Logging message
     * @param data Logging data
     */
    public logInfo(msg: string, data?: Object): void {
        this.logMessage(msg, 'INFO');
        if (data) {
            this.logObject(data, 'INFO');
        }
    }

    /**
     * Method to log a message as warning
     * @param msg Logging message
     * @param data Logging data
     */
    public logWarn(msg: string, data?: Object): void {
        this.logMessage(msg, 'WARN');
        if (data) {
            this.logObject(data, 'WARN');
        }
    }

    /**
     * Method to log a message as debug
     * @param msg Logging message
     * @param data Logging data
     */
    public logDebug(msg: string, data?: Object): void {
        this.logMessage(msg, 'DEBUG');
        if (data) {
            this.logObject(data, 'DEBUG');
        }
    }

    /**
     * Method to open the logging output channel
     */
    public showLog() {
        return this.outputChannel.show();
    }

    /**
     * Method to log an object
     * @param data The object which should be logged
     * @param level The current loglevel
     */
    private logObject(data: Object, level: LOG_LEVEL): void {
        const titel = new Date().toLocaleTimeString();
        const msg = JSON.stringify(data, null, 2);
        this.outputChannel.appendLine(`${titel}: ${level}: ${msg}`);
    }

    /**
     * Method to log a message
     * @param msg The message which should be logged
     * @param level The current loglevel
     */
    private logMessage(msg: string, level: LOG_LEVEL): void {
        const titel = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`LOG [${level} ${titel}]: ${msg}`);
    }
}
