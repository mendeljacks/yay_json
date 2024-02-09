export const array_equals = (array1: readonly any[], array2: readonly any[]) =>
    array1.length === array2.length &&
    array1.every((el1, i) => el1 === array2[i])
