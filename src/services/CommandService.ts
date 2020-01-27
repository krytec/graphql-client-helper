import * as vscode from 'vscode';
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import GraphQLService from './GraphQLService';
import { LoggingService } from './LoggingService';
import { showLogingWindowCommand } from '../commands/ShowLogCommand';

export class CommandService{

    constructor(
        private ctx: vscode.ExtensionContext, 
        private graphQLService: GraphQLService,
        private logger: LoggingService
        ){}
    
    registerCommands(){
        const showLogCommand = vscode.commands.registerCommand(
            'extension.showLog',
            () => {
                showLogingWindowCommand(this.logger);
            }
        );

        const createSchemaCommand = vscode.commands.registerCommand(
            'extension.createSchema',
            () => {
                showCreateSchemaInput(this.graphQLService);
            }
        );

        this.ctx.subscriptions.push(showLogCommand);
        this.ctx.subscriptions.push(createSchemaCommand);
    }
}