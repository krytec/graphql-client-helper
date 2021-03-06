export const serviceTemplate: string = `
/**
 * Auto generated by GraphaX Extension
 */
%imports%

/**
 * %serviceNameToTitleCase% service class to query an endpoint with an ApolloClient 
 */
export class %serviceNameToTitleCase%Service {

    constructor(private _client){}

    %functions%

};
`;

export const serviceFunctionTemplate: string = `
    public async get%functionName%(args:schemaTypes.%inputType%){
        return new Promise(async (resolve,reject) => {
            await this._client.%functionType%({
                query: %request%,
                variables: args
            }).then(data => {resolve(data.data.%returnType%);})
            .catch(error => {reject(error)});
        });
    }
`;
