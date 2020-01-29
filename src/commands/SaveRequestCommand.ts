import { Request, RequestNodeProvider } from '../services/RequestNodeProvider';
import GraphQLService from '../services/GraphQLService';

export function showSaveRequestCommand(
    element: Request,
    graphQLService: GraphQLService
) {
    graphQLService.writeRequestToFile(element);
}
