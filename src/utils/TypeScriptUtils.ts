import {
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLInputObjectType,
    GraphQLFieldMap,
    GraphQLNonNull,
    GraphQLEnumType,
    GraphQLList
} from 'graphql';
import { SchemaType } from '../model/SchemaType';
import { SchemaField } from '../model/SchemaField';
import { SchemaScalar, ScalarField } from '../model/SchemaScalar';

/**
 * Method to construct a SchemaType from a GraphQLObjectType
 * @param type GraphQLObjectType
 */
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

/**
 * Method to construct a SchemaField from a GraphQLType
 * @param field Field of a GraphQLType
 */
function constructField(field: any): SchemaField {
    let name = field.name;
    let nonNull = false;
    let isScalar = false;
    let ofType = '';
    let isList = false;
    let description = field.description;
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
        isList = true;
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
        description
    );
}

/**
 * Method to create a Scalar from a GraphQLScalarType
 * @param scalarType GraphQLScalarType
 */
export function constructScalarField(
    scalarType: GraphQLScalarType
): ScalarField {
    let name = scalarType.name;
    let description = scalarType.description;
    let type = 'any';
    if (
        scalarType.name === 'Int' ||
        scalarType.name === 'Float' ||
        scalarType.name === 'Double'
    ) {
        type = 'number';
    } else if (scalarType.name === 'String' || scalarType.name === 'ID') {
        type = 'string';
    } else if (scalarType.name === 'Boolean') {
        type = 'boolean';
    }
    return new ScalarField(name, type, description ? description : undefined);
}

/**
 * ! TODO: Implementation
 * @param inputType GraphQLInputObjectType
 */
export function constructInputType(inputType: GraphQLInputObjectType) {}

/**
 * ! TODO: Implementation
 * @param enumType GraphQLEnumType
 */
export function constructEnumType(enumType: GraphQLEnumType) {}
