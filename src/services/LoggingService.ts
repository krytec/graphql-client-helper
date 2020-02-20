import { window } from 'vscode';

enum LOG_LEVEL {
    'WARN',
    'INFO',
    'DEBUG'
}

/**
 * LoggingService for the extension
 */
export class LoggingService {
    private outputChannel = window.createOutputChannel('GraphaX Log');
    private loglevel: LOG_LEVEL = LOG_LEVEL.DEBUG;
    constructor() {}

    /**
     * Method to log a message as info
     * @param msg Logging message
     * @param data Logging data
     */
    public logInfo(msg: string, data?: Object): void {
        this.logMessage(msg, LOG_LEVEL.INFO);
        if (data) {
            this.logObject(data, LOG_LEVEL.INFO);
        }
    }

    /**
     * Method to log a message as warning
     * @param msg Logging message
     * @param data Logging data
     */
    public logWarn(msg: string, data?: Object): void {
        this.logMessage(msg, LOG_LEVEL.WARN);
        if (data) {
            this.logObject(data, LOG_LEVEL.WARN);
        }
    }

    /**
     * Method to log a message as debug
     * @param msg Logging message
     * @param data Logging data
     */
    public logDebug(msg: string, data?: Object): void {
        this.logMessage(msg, LOG_LEVEL.DEBUG);
        if (data) {
            this.logObject(data, LOG_LEVEL.DEBUG);
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
        if (this.loglevel <= level) {
            const titel = new Date().toLocaleTimeString();
            const msg = JSON.stringify(data, null, 2);
            this.outputChannel.appendLine(
                `${titel}: ${LOG_LEVEL[level]}: ${msg}`
            );
        }
    }

    /**
     * Method to log a message
     * @param msg The message which should be logged
     * @param level The current loglevel
     */
    private logMessage(msg: string, level: LOG_LEVEL): void {
        if (this.loglevel <= level) {
            const titel = new Date().toLocaleTimeString();
            this.outputChannel.appendLine(
                `LOG [${LOG_LEVEL[level]} ${titel}]: ${msg}`
            );
        }
    }
}
