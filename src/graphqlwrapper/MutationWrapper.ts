import { GraphQLWrapper } from './GraphQLWrapperInterface';
import { RequestWrapper } from './RequestWrapper';
import { FieldWrapper } from './FieldWrapper';
import { dedent } from '../utils/Utils';

/**
 * Wrapper class for a GraphQL mutation, extends the @RequestWrapper class
 */
export class MutationWrapper extends RequestWrapper implements GraphQLWrapper {
    constructor(
        _name: string,
        _type: string,
        _returnsList: boolean,
        _description?: string
    ) {
        super(_name, _type, _returnsList, false, true, _description);
    }

    toString(): string {
        return '';
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
        //? FIXME: Find a way to make this code look cleaner
        let typeAsString: string = `
/**${this.Description}*/
query ${this.Name}Query{
    ${fieldsAsString}
};
        `;

        return typeAsString;
    }
}
