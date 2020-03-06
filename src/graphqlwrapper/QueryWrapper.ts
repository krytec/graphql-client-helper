import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { TypeWrapper } from './TypeWrapper';
import { FieldWrapper } from './FieldWrapper';
import { RequestWrapper } from './RequestWrapper';
import { dedent } from '../utils/Utils';

/**
 * Wrapper class for a GraphQLQueryType extends the @RequestWrapper class
 */
export class QueryWrapper extends RequestWrapper implements GraphQLWrapper {
    constructor(
        _name: string,
        _type: string,
        _returnsList: boolean,
        _description?: string
    ) {
        super(_name, _type, _returnsList, true, false, _description);
    }

    toString(): string {
        return 'Query: ' + this.Name;
    }

    /**
     * Function to create Typescript type code as a representation of the obj
     * @returns obj as Typescript type code as a String
     */
    toTypescriptType(): string {
        let fieldsAsString: string = this.args
            .map(x => dedent`\n${x.toTypescriptType()},\n`)
            .map(x => x.replace(/\n/g, '\n    '))
            .join('');
        let typeAsString: string = `
query ${this.Name}Query(){
    ${fieldsAsString}
};
        `;

        return typeAsString;
    }
}
