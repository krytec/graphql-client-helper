export const reactComponent = `
import React from 'react';
import { useQuery, useMutation } from '@apollo/react-hooks';
import gql from 'graphql-tag';
%imports%

%requests%

%functions%
`;

export const reactQueryFunction = `
export function %serviceName%(args:any) {
    const { loading, data } = useQuery<%query%%args%>(
        %requestName%,
        //TODO: provide variables
        {variables: args}
    );

    return (
        <div>
            {loading ? (
                <p>Loading...</p>
            ): (
                <p>{data ? JSON.stringify(data.%request%): "Error fetching data"}</p>
            )}
        </div>
    );
}
`;

export const reactMutationFunction = `
export function %serviceName%(args:any) {
    const { loading, data } = useMutation<%mutation%%args%>(
        %requestName%,
        //TODO: provide variables
        {variables : args }
    );

    return (
        <div>
            {loading ? (
                <p>Loading...</p>
            ): (
                <p>{data ? JSON.stringify(data.%request%): "Error fetching data"}</p>
            )}
        </div>
    );
}
`;

export const reactTest = `
import { render, act } from "@testing-library/react";
import { ApolloProvider } from "@apollo/react-hooks";
import {MockedProvider, wait} from '@apollo/react-testing';
import React from 'react';
%imports%

const mockingData = %mockingData%;

const mocks = [
    {
        request: {
          %request%: %requestName%
        },
        result: {
          data: {
            %requestType%: mockingData
          },
        },
      },
];

describe('it should test pokemonComponent', () => {
    
    it("should render without error", () => {
        act(async () => {
        const result = render(<MockedProvider mocks={mocks} addTypename={false}>
            <%componentName%></%componentName%>
        </MockedProvider>);
        await wait(5000);
        expect(result.baseElement.textContent).toContain(JSON.stringify(mockingData));
        });
    });

    it("should test loading state", () => {
        act(()=>{
            const result = render(<MockedProvider mocks={[]} addTypename={false}>
                <%componentName%></%componentName%>
            </MockedProvider>);
            expect(result.baseElement.textContent).toContain('Loading...');
        });
    })

});
`;
