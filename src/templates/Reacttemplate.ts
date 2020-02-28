export const reactComponent = `
import React from 'react';
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';

%requests%

%functions%
`;

export const reactQueryFunction = `
export function %serviceName%() {
    const { loading, data } = useQuery<%query% %args%>(
        %request%,
        //TODO: provide variables
        {variables: null}
    );

    return (
        <div>
            {loading ? (
                <p> Loading ... </p>
            ): (
                <p> data.%request% </p>
            )}
        </div>
    );
}
`;

export const reactMutationFunction = `
export function %serviceName%() {

}
`;
