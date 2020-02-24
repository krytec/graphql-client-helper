export const angularServiceTemplate: string = `
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

export const angularComponentTemplate: string = `
import { Component, OnInit } from '@angular/core';
import * as schemaTypes from 'src/graphqlschema/schemaTypes';
import { $myServiceTitel } from './$myNameTitel.service';


@Component({
  selector: 'app-$myName-component',
})
export class $myNameTitelComponent implements OnInit {
  $myVariables

  constructor(private service: $myServiceTitel) { }

  ngOnInit() {
    //TODO: insert arguments for requests
    $myFunctions
  }

}
`;
