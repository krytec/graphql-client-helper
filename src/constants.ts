import * as vscode from 'vscode';
//Default maximum query depth as it is used with graphql clients
export const maxQueryDepth = 5;
//Empty graphax.json file
export const graphaxjsonTemplate = `
{
    "extension": "GraphaX",
    "service": [],
    "requests": []
}
`;
