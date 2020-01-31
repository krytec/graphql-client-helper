import { StateService } from './StateService';

/**
 * Service class which handles the internal graphql client
 */
export class ClientService {
    constructor(private _state: StateService) {}
}
