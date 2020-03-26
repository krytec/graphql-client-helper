# GraphaX

## Features

### Schema Fetching

GraphaX can fetch a schema from a given endpoint. Therefor the user has to run the "GraphaX: Create Schema" Command.
The extension will generate a schema.gql file, as well as a schemaTypes.ts file if the typescript setting is set to true.

### Request creation

If an endpoint in the settings and a schema.gql file exists in the current generated folder, the extension will add a new container to VS Code. The container has the GraphQL Icon and will provide three different tree views.
The first tree view contains all requests which are provided in the schema. The user can select a request and the fields,
he wants to include in his query or mutation. Then he can click on the save icon to create a custom request with a given name.

### Run and test custom requests

After creating a custom request, the user can test the created request. Therefor he needs to click on the run icon of the custom request he wants to test. After providing arguments he can click on the run icon in the upper right corner of the quickpickbox. This will send the custom request to the endpoint and an answer will be shown, if the endpoint returns no error.

### Creating and generating code for a service

To create a service the user can select multiple custom requests. With a click on the save icon of the custom request tree view menu, a service with a given name is created and the code for the service will automatically be created and saved. The user can select a framework in the options provided by GraphaX. This way the extension will generate code for the selected framework.

### Add code to GraphaX

With a right click on a service folder, or an selected request, the user can add the given selection to the extension.
The request has to provide a name and has to be valid to be added to the extension.
A service folder needs to at least contain one request in a seperate file, to be added to the extension.

### Deleting from GraphaX

The user can delete a request from a service, as well as delete a service from GraphaX.
If the user selects a request from a service and wants to delete the selected request, the extension will remove all code, that is connected to the selected request. If a service should be deleted, the extension will remove all files in the folder of the service, as well as the folder itself from the filedirectory.

### Autocompletion and validation

Besides the code generation and testing, GraphaX provides autocompletion and realtime valdiation for .gql Files.
If a request is written in a .gql File the extension will provide autocompletion options as well as realtime validation for the written queries and mutations in the file.
Hovering over the validation error will provide more information about the error.

## Extension Settings

This extension contributes the following settings:

-   `graphax.typescript`: enable/disable typescript types generation

-   `graphax.schema.folder`: set the folder where the schema and types should be saved to

-   `graphax.schema.endpoint`: GraphQL endpoint for fetching schema and run requests on

-   `graphax.service.framework`: The framework for which the extension creates code

-   `graphax.clients.headers`: GraphQL Client headers for requests

## Release Notes

### v0.0.1

First test release with all major functions. In this version GraphaX can generate code for angular and react.

### References

-   Icons by [FeatherIcons](https://feathericons.com/)
