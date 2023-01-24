const last = arr => arr[arr.length - 1]
export const capitalize = str =>
    str
        .split('_')
        .map(el => el[0].charAt(0).toUpperCase() + el.slice(1))
        .join(' ')
const lowerize = str =>
    str
        .split(' ')
        .map(el => (el[0] || '').charAt(0).toLowerCase() + el.slice(1))
        .join('_')
const crumb = arr => arr.map(capitalize).join(' > ')
const decrumb = str => str.split(' > ').map(lowerize)
const leaves_only = obj =>
    Object.entries(obj)
        .filter(([key, value]) => !Array.isArray(value))
        .reduce((acc, val) => ((acc[val[0]] = val[1]), acc), {})
const branches_only = obj =>
    Object.entries(obj)
        .filter(([key, value]) => Array.isArray(value))
        .reduce((acc, val) => ((acc[val[0]] = val[1]), acc), {})
const merge_with_concat = (l, r) => {
    let output = { ...l }
    for (const key in r) {
        if (Array.isArray(r[key])) {
            if (!Array.isArray(output[key])) output[key] = []
            output[key] = [...output[key], ...r[key]]
        } else {
            output[key] = r[key]
        }
    }
    return output
}
const make_column_groups_from_json = (obj = {}, path = [], parent = null) => {
    const leaves = leaves_only(obj)
    const branches = branches_only(obj)

    const column_group = {
        path,
        breadcrumb: crumb(path),
        columns: Object.keys(leaves),
        parent: parent,
        children: Object.keys(branches)
    }

    // child arrays trigger recursion
    const child_column_groups = Object.entries(branches).flatMap(([key, value]: [any, any]) => {
        const obj_with_all_child_columns = value.reduce((acc, val) => {
            acc = merge_with_concat(acc, val)
            return acc
        }, {})
        return make_column_groups_from_json(obj_with_all_child_columns, [...path, key], last(path))
    })

    if (column_group.breadcrumb === '') return child_column_groups
    return [column_group, ...child_column_groups]
}

const all_null = obj => {
    const entries = Object.entries(obj)
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i]
        if (value !== null) return false
    }
    return true
}

const remove_null_rows = obj => {
    const leaves = leaves_only(obj)
    const branches = branches_only(obj)

    const clean_branches = Object.entries(branches).reduce((a, v: any) => {
        const [key, val] = v
        const filtered_arr = val.filter(el => !all_null(el)).map(remove_null_rows)
        if (filtered_arr.length > 0) a[key] = val
        return a
    }, {})

    return {
        ...leaves,
        ...clean_branches
    }
}

const make_column_groups_from_aoa = aoa => {
    const group_names = aoa[0]
    const column_names = aoa[1]

    var column_groups = []
    for (let i = 0; i < group_names.length; i++) {
        const breadcrumb = group_names[i]
        if (breadcrumb !== null && breadcrumb !== '') {
            // New column group
            const path = decrumb(breadcrumb)
            const parent = path.length === 1 ? null : path[path.length - 2]
            const column_group = {
                path: path,
                breadcrumb: breadcrumb,
                columns: [],
                parent: parent,
                children: []
            }
            const ind = column_groups.findIndex(el => el.path[el.path.length - 1] === parent)
            if (ind > -1) column_groups[ind].children.push(path[path.length - 1])
            column_groups.push(column_group)
        }

        column_groups[column_groups.length - 1].columns.push(lowerize(column_names[i]))
    }

    return column_groups
}

// adds empty rows to the bottom until rows.length >= height. Assumes all rows are of equal width.
const add_empty_rows = (rows, blank_cell_data, desired_height) => {
    if (rows.length === 0) {
        throw Error('Cant figure out desired width for empty rows!')
    }
    const row_width = rows[0].length
    const extra_row_count = desired_height - rows.length
    const extra_rows = []
    while (extra_rows.length < extra_row_count) {
        const extra_row = []
        for (let i = 0; i < row_width; i++) {
            extra_row.push(blank_cell_data)
        }
        extra_rows.push(extra_row)
    }

    const new_rows = rows.concat(extra_rows)
    return new_rows
}

// takes a list of blocks and lays them out side by side. Assumes all blocks are of equal height
const combine_blocks = blocks => {
    const height = blocks[0].length
    const combined_blocks = []
    for (let i = 0; i < height; i++) {
        let row = []
        for (const block of blocks) {
            row = [...row, ...block[i]]
        }
        combined_blocks.push(row)
    }
    return combined_blocks
}

// takes one piece of json data and converts it to cell data
const data_to_cell = data => {
    if (data === null || data === undefined) {
        return ''
    } else {
        return data
    }
}

// gets one row for one column group
const get_column_group_row = (group_columns, obj) => {
    return group_columns.map(column => obj[column]).map(data_to_cell)
}

// returns array of array rows for the specified column groups
const make_rows = (column_groups, objs, route) => {
    // A row is all the cells of one row (that is descended from this route. There could be parent data that this is unaware of).
    // A block is an array of rows but only for some column groups, not all,
    // for example a block might be all the variant and vin data, but not product or pin cells

    // each object maps to one or more rows
    const rows = objs.flatMap(obj => {
        const breadcrumb = crumb(route)
        const column_group = column_groups.filter(group => group.breadcrumb === breadcrumb)[0]

        const children = column_group.children
        const child_blocks = children.map(child => {
            const child_route = [...route, child]

            // if there is no child, put an array with an empty object.
            // This will map to a single block row with all columns from the child group empty.
            // Grandchild empty cells will also get added, since we are calling this function recursively
            const child_objs = obj[child] || [{}]
            const child_block = make_rows(column_groups, child_objs, child_route)
            return child_block
        })

        // This block and all child blocks must have the same height, namely the height of the tallest child block
        const children_block_heights = child_blocks.map(child_block => child_block.length)
        const height = Math.max(...children_block_heights)
        const same_height_child_blocks = child_blocks.map(child_block =>
            add_empty_rows(child_block, '', height)
        )

        const group_columns = column_group.columns
        const group_cells = get_column_group_row(group_columns, obj)
        if (group_cells.length !== group_columns.length) {
            throw Error('Cell data must be the same length as number of columns')
        }

        const own_block = add_empty_rows([group_cells], '', height)
        const combined_block = combine_blocks([own_block, ...same_height_child_blocks])
        return combined_block
    })
    return rows
}

const make_header_rows = column_groups => {
    // converts column groups into two aoa rows (one for the column group names and one for the column names)
    return column_groups.reduce(
        (acc, val) => {
            if (val.columns.length === 0) {
                return acc
            }
            acc[0] = acc[0].concat([val.breadcrumb, ...Array(val.columns.length - 1).fill('')])
            acc[1] = acc[1].concat(val.columns.map(capitalize))
            return acc
        },
        [[], []]
    )
}

// splits an array based on a predicate so that every element that satisfies the predicate is the first element in a subarray, example:
//
// const arr = [2, 1, 2, 3, 1, 4, 1, 1, 6, 7, 8, 1]
// const split_by_ones = split_at(equals(1))
// split_by_ones(arr) // result -> [[2], [1, 2, 3], [1, 4], [1], [1, 6, 7, 8], [1]]
const split_at = (predicate, arr) => {
    return arr
        .reduce(
            (acc, val) => {
                if (predicate(val)) {
                    acc.push([val])
                } else {
                    acc[acc.length - 1].push(val)
                }

                return acc
            },
            [[]]
        )
        .filter(el => el.length > 0)
}
// returns true if the row has data within the range of cells start_index (inclusive) to end_index (exclusive)
const row_has_data_in = (start_index, end_index, row) => {
    for (let i = start_index; i < end_index; i++) {
        const data = row[i]
        if (data !== '') {
            return true
        }
    }

    return false
}
const row_to_json = (row, columns) => {
    if (row.length !== columns.length) {
        throw Error('Row length must be the same as column length')
    }

    const json = {}
    for (let i = 0; i < columns.length; i++) {
        const raw_cell = row[i]
        const column = columns[i]

        json[column] = raw_cell === '' ? null : raw_cell
    }

    return json
}
// returns the index of the first column belonging to the specified column group
const get_start_column_index = (column_groups, column_group_index) => {
    let start_column_index = 0
    for (let i = 0; i < column_groups.length; i++) {
        const column_group = column_groups[i]
        if (i === column_group_index) {
            return start_column_index
        }
        
        start_column_index += column_group.columns.length
    }

    throw Error('Could not find specified route in column groups')
}
const rollup_rows = (rows, column_groups, column_group_index) => {
    const column_group = column_groups[column_group_index]
    const group_columns = column_group.columns
    const children = [...new Set(column_group.children)] as any[]
    const start_column_index = get_start_column_index(column_groups, column_group_index) // inclusive
    const end_column_index = start_column_index + group_columns.length // exclusive

    const blocks = split_at(row => row_has_data_in(start_column_index, end_column_index, row), rows)

    const route = column_group.path
    const own_jsons = blocks
        .map(block => {
            const own_block_row = block[0].slice(start_column_index, end_column_index)
            const own_json = row_to_json(own_block_row, group_columns)

            for (const child of children) {
                const child_route = [...route, child]

                // there could be multiple repeats of the same child. In that case, we concat all the jsons together into
                // on array
                const child_column_group_indices = column_groups.flatMap((e, i) => {
                    const is_child_column_group = e.breadcrumb === crumb(child_route)
                    return is_child_column_group ? [i] : []
                })
                child_column_group_indices.forEach((child_column_group_index) => {
                    const child_jsons = rollup_rows(block, column_groups, child_column_group_index)
                    if (child_jsons.length > 0) {
                        if (!own_json[child]) {
                            own_json[child] = []
                        }
                        child_jsons.forEach(e => own_json[child].push(e))
                    }
                })
            }

            return own_json
        })
        .filter(json => Object.keys(json).length > 0) // filter out empty or all null objects
        .filter(json => Object.values(json).some(value => value !== null))

    return own_jsons
}

const make_json_from_rows = (rows, column_groups, table_name) => {
    const column_group_index = column_groups.findIndex(e => e.breadcrumb === crumb([table_name]))
    return remove_null_rows({
        [table_name]: rollup_rows(rows, column_groups, column_group_index)
    })
}

export const json_to_aoa = json => {
    if (Object.keys(json).length !== 1)
        throw 'json tree must begin with a single root key, eg {products: [...]}'
    const column_groups = make_column_groups_from_json(json)
    const header_rows = make_header_rows(column_groups)
    const table_name = Object.keys(json)[0]
    const data_rows = make_rows(column_groups, json[table_name], [table_name])
    return [...header_rows, ...data_rows]
}
export const aoa_to_json = aoa => {
    const column_groups = make_column_groups_from_aoa(aoa)
    const json = make_json_from_rows(
        aoa.slice(2, Infinity),
        column_groups,
        column_groups[0].path[0]
    )
    return json
}
