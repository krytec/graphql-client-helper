import * as vscode from 'vscode'
import { showCreateSchemaInput } from '../commands/SchemaInputCommand';
import GraphQLService from './GraphQLService';

export class CommandService{

    constructor(private ctx: vscode.ExtensionContext){

    }
    
    registerCommands(){
        const createSchemaCommand = vscode.commands.registerCommand(
            'extension.createSchema',
            () => {
                showCreateSchemaInput(this.ctx.globalState.get("graphQLService") as GraphQLService);
            }
        );

        this.ctx.subscriptions.push(createSchemaCommand);
    }
}