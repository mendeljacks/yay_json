import { is_simple_object } from './deep_get'

export const deep_set = (
    path_array: (string | number)[],
    value: any,
    obj: any
): void => {
    if (path_array.length === 0) return obj

    let pointer = obj

    for (let i = 0; i < path_array.length; i++) {
        const path_el = path_array[i]
        const next_path_el =
            i !== path_array.length - 1 ? path_array[i + 1] : undefined

        const next_el_default = typeof next_path_el === 'number' ? [] : {}

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

        if (!contains_path_el) {
            if (is_array) {
                const items_to_add = new Array(
                    Number(path_el) - pointer.length
                ).map(el => undefined)
                pointer.push(...items_to_add)
            }

            pointer[path_el] = next_el_default
        }

        const child_is_primitive =
            !is_simple_object(pointer[path_el]) &&
            !Array.isArray(pointer[path_el])
        if (!contains_path_el || child_is_primitive) {
            pointer[path_el] = next_el_default
        }

        if (i === path_array.length - 1) {
            pointer[path_el] = value
        }

        pointer = pointer[path_el]
    }
}