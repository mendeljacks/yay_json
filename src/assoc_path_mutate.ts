import { clone, type } from 'ramda'

// just like assocPath, but mutates the input argument and so is more performant
export const assoc_path_mutate = (path, value, obj) => {
    var p = clone(path) // path which gets smaller for each while loop iteration
    var o = obj // object which moves with p
    while (p.length - 1) {
        var p_el = p.shift()
        var next_p_el = p[0]

        if (type(o) === 'Array' && typeof p_el !== 'number') {
            throw Error('Trying to access an array with a non numeric index')
        }

        if (!(p_el in o)) {
            // create obj/array if not there yet
            if (typeof next_p_el !== 'number') {
                o[p_el] = {}
            } else {
                o[p_el] = []
            }
        }

        o = o[p_el]
    }

    o[p[0]] = value
}
