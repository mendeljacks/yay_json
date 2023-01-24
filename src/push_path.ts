import { isNil, path, pathOr } from 'ramda'
import { assoc_path_mutate } from './assoc_path_mutate'

/**
 * Push values to arrays which are deeply nested
 */
export const push_path = (path_to_arr, val, obj) => {
    if (isNil(pathOr(null, path_to_arr, obj))) {
        assoc_path_mutate(path_to_arr, [], obj)
    }

    // @ts-ignore
    path(path_to_arr, obj).push(val)

    return obj
}
