import { GraphQLWrapper } from './GraphQLWrapperInterface';

export class MutationWrapper implements GraphQLWrapper {
    toString(): string {
        throw new Error('Method not implemented.');
    }
    toTypescriptType(): string {
        throw new Error('Method not implemented.');
    }
}
