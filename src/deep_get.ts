export const is_simple_object = val => !!val && val.constructor === Object
export const deep_get = (
    path_array: (string | number)[],
    obj: any,
    default_value: any = undefined
): any => {
    let pointer = obj

    for (const path_el of path_array) {
        const is_array = Array.isArray(pointer)
        const is_object = is_simple_object(pointer)

        // if (is_array && type(path_el) !== 'Number') {
        //     throw new Error('Trying to path into an array without a number index')
        // }

        const contains_path_el = is_array
            ? path_el < pointer.length
            : is_object
            ? path_el in pointer
            : false

        if (contains_path_el) {
            pointer = pointer[path_el]
            continue
        } else {
            return default_value
        }
    }

    return pointer
}
