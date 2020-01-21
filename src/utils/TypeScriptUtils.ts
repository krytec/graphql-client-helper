import {
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLInputObjectType,
    GraphQLFieldMap,
    GraphQLNonNull,
    GraphQLEnumType,
    GraphQLList
} from 'graphql';
import { SchemaType, SchemaField } from '../model/SchemaTypes';
import { SSL_OP_CISCO_ANYCONNECT } from 'constants';

export function constructType(type: GraphQLObjectType): SchemaType {
    let constructedType = new SchemaType(
        type.name,
        type.description ? type.description : undefined
    );
    let fields = Object.values(type.getFields());
    let interfaces = Object.values(type.getInterfaces());
    fields.forEach(element => {
        let field: SchemaField = constructField(element);
        constructedType.addField(field);
    });
    return constructedType;
}

function constructField(field: any): SchemaField {
    let name = field.name;
    let nonNull = false;
    let isScalar = false;
    let ofType = '';
    let isList = false;
    if (field.type instanceof GraphQLNonNull) {
        nonNull = true;
        if (field.type.ofType instanceof GraphQLObjectType) {
            ofType = field.type.ofType.name;
            nonNull = true;
        } else if (field.type.ofType instanceof GraphQLScalarType) {
            isScalar = true;
            ofType = field.type.ofType.name;
        } else if (field.type.ofType instanceof GraphQLEnumType) {
            ofType = field.type.ofType.name;
        } else if (field.type.ofType instanceof GraphQLList) {
            ofType = field.type.ofType.ofType.name;
            isList = true;
        }
    } else if (field.type instanceof GraphQLScalarType) {
        isScalar = true;
        ofType = field.type.name;
    } else if (field.type instanceof GraphQLEnumType) {
        ofType = field.type.name;
    } else if (field.type instanceof GraphQLList) {
        ofType = field.type.ofType.name;
    } else if (field.type instanceof GraphQLObjectType) {
        ofType = field.type.name;
    }
    return new SchemaField(
        name,
        nonNull,
        isScalar,
        isList,
        ofType,
        field.description
    );
}

export function constructScalar(scalar: GraphQLScalarType) {}

export function constructInputType(inputType: GraphQLInputObjectType) {}
