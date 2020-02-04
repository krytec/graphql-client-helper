import * as vscode from 'vscode';
export const projectId = 'graphql-client-helper';
export const version = '0.0.1';
export const publisherId = 'flo.ortmann@web.de';
export const maxQueryDepth = 5;

export const angularService: string = `
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import * as schemaTypes from '../../graphqlschema/schemaTypes';
$myImports

@Injectable({
  providedIn: 'root'
})
export class $serviceName {

  constructor(private apollo: Apollo) { }

  $myFunctions
}`;
