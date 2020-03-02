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
import * as schemaTypes from '../../graphqlschema/schemaTypes';
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

export const angularTestTemplate = `
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { async, ComponentFixture, TestBed,inject } from '@angular/core/testing';
import { %serviceName% } from './%service%.service';
import * as schemaTypes from '../../graphqlschema/schemaTypes';

%test_data%

%test_requests%

describe('%serviceName% test', () => {
    let backend: ApolloTestingController;
    let %serviceNameToLowerCase%: %serviceName%;
    beforeEach(() => {
        TestBed.configureTestingModule({
        imports: [
            ApolloTestingModule,
        ],
        providers:[%serviceName%]
        });
        %serviceNameToLowerCase% = TestBed.get(%serviceName%);
        backend = TestBed.get(ApolloTestingController);
    });

    it('should create', () => {
        expect(backend).toBeTruthy();
      });

    %request_test%
});
`;

export const angularTestRequestTemplate = `
  it("should test %request% ", (done) =>{
    %serviceNameToLowerCase%.%request%(null).subscribe(result => {
      expect(result.data.%returnType%).toEqual(%test_dataName%);
      done();
    })
    backend.expectOne(%request%).flush(%test_requestName%);
  })
`;
