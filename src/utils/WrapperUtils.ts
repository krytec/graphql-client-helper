import {
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLInputObjectType,
    GraphQLNonNull,
    GraphQLEnumType,
    GraphQLList,
    GraphQLFieldMap
} from 'graphql';
import { TypeWrapper } from '../wrapper/GraphQLTypeWrapper';
import { FieldWrapper } from '../wrapper/GraphQLFieldWrapper';
import { ScalarFieldWrapper } from '../wrapper/GraphQLScalarWrapper';
import { EnumWrapper } from '../wrapper/GraphQLEnumWrapper';
import { InputTypeWrapper } from '../wrapper/GraphQLInputTypeWrapper';
import { QueryWrapper } from '../wrapper/GraphQLQueryWrapper';
import { MutationWrapper } from '../wrapper/GraphQLMutationWrapper';

/**
 * Method to construct a TypeWrapper from a GraphQLObjectType
 * @param type GraphQLObjectType
 */
export function constructType(type: GraphQLObjectType): TypeWrapper {
    let constructedType = new TypeWrapper(
        type.name,
        type.description ? type.description : undefined
    );
    let fields = Object.values(type.getFields());
    fields.forEach(element => {
        let field: FieldWrapper = constructField(element);
        constructedType.addField(field);
    });
    //! TODO: implement interfaces
    let interfaces = Object.values(type.getInterfaces());
    return constructedType;
}

/**
 * Method to construct a FieldWrapper from a GraphQLType
 * @param field Field of a GraphQLType
 */
function constructField(field: any): FieldWrapper {
    let name = field.name;
    let nonNull = false;
    let isScalar = false;
    let ofType = '';
    let isList = false;
    let description = field.description;
    if (field.type instanceof GraphQLNonNull) {
        nonNull = true;
        if (
            field.type.ofType instanceof GraphQLObjectType ||
            field.type.ofType instanceof GraphQLInputObjectType
        ) {
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
        if (field.type.ofType instanceof GraphQLNonNull) {
            var listtype = field.type.ofType.ofType;
            nonNull = true;
            if (
                listtype instanceof GraphQLObjectType ||
                listtype instanceof GraphQLInputObjectType
            ) {
                ofType = listtype.name;
                nonNull = true;
            } else if (listtype instanceof GraphQLScalarType) {
                isScalar = true;
                ofType = listtype.name;
            } else if (listtype instanceof GraphQLEnumType) {
                ofType = listtype.name;
            }
        } else {
            ofType = field.type.ofType.name;
        }
    } else if (
        field.type instanceof GraphQLObjectType ||
        field.type instanceof GraphQLInputObjectType
    ) {
        ofType = field.type.name;
    }
    return new FieldWrapper(
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
): ScalarFieldWrapper {
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
    return new ScalarFieldWrapper(
        name,
        type,
        description ? description : undefined
    );
}

/**
 * Creates a InputTypeWrapper from a GraphQLInputObjectType and returns it
 * @param inputType GraphQLInputObjectType
 */
export function constructInputType(inputType: GraphQLInputObjectType) {
    let inputTypeWrapper = new InputTypeWrapper(
        inputType.name,
        inputType.description ? inputType.description : undefined
    );

    let fields = Object.values(inputType.getFields());
    fields.forEach(field => {
        var fieldWrapper = constructField(field);
        inputTypeWrapper.addField(fieldWrapper);
    });
    return inputTypeWrapper;
}

/**
 * Method to construct a EnumWrapper from a GraphQLEnumType
 * @param enumType GraphQLEnumType
 */
export function constructEnumType(enumType: GraphQLEnumType) {
    return new EnumWrapper(
        enumType.name,
        enumType.getValues(),
        enumType.description ? enumType.description : undefined
    );
}

/**
 * Method to construct a QueryWrapper from a query object
 * @param query Query
 */
export function constructQuery(query: any): QueryWrapper {
    var queryAsField = constructField(query);
    const queryWrapper = new QueryWrapper(
        queryAsField.name,
        queryAsField.ofType,
        queryAsField.isList,
        queryAsField.description
    );
    return queryWrapper;
}

/**
 * Method to construct a MutationWrapper from a mutation object
 * @param mutation mutation
 */
export function constructMutation(mutation: any): MutationWrapper {
    var mutationAsField = constructField(mutation);
    const queryWrapper = new MutationWrapper(
        mutationAsField.name,
        mutationAsField.ofType,
        mutationAsField.isList,
        mutationAsField.description
    );
    return queryWrapper;
}
