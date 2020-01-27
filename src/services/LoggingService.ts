import { window } from "vscode";
import { projectId } from "../constants";

type LOG_LEVEL = "WARN" | "INFO" | "DEBUG";

export class LoggingService{
    private outputChannel = window.createOutputChannel(projectId);

    constructor(){}

    public logInfo(msg: string, data?: Object): void {
        this.logMessage(msg, "INFO");
        if(data){
            this.logObject(data, "INFO");
        }
    }

    public logWarn(msg: string, data?: Object): void {
        this.logMessage(msg, "WARN");
        if(data){
            this.logObject(data, "WARN");
        }
    }

    public logDebug(msg: string, data?: Object): void {
        this.logMessage(msg, "DEBUG");
        if(data){
            this.logObject(data, "DEBUG");
        }
    }

    public showLog(){
        return this.outputChannel.show();
    }
    
    private logObject(data: Object, level: LOG_LEVEL): void {
        const titel = new Date().toLocaleTimeString();  
        const msg = JSON.stringify(data, null, 2);
        this.outputChannel.appendLine(`${titel}: ${level}: ${msg}`);
    }

    private logMessage(msg: string, level: LOG_LEVEL): void{
        const titel = new Date().toLocaleTimeString();  
        this.outputChannel.appendLine(`LOG [${level} ${titel}]: ${msg}`);
    }
}