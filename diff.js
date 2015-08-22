import { compare } from './equal';
function pushAll(array, items) {
    return Array.prototype.push.apply(array, items);
}
function last(array) {
    return array[array.length - 1];
}
/**
subtract(a, b) returns the keys in `a` that are not in `b`.
*/
function subtract(a, b) {
    var obj = {};
    for (var add_key in a) {
        obj[add_key] = 1;
    }
    for (var del_key in b) {
        delete obj[del_key];
    }
    return Object.keys(obj);
}
/**
intersection(objects) returns the keys that shared by all given `objects`.
*/
function intersection(objects) {
    // initialize like union()
    var key_counts = {};
    objects.forEach(object => {
        for (var key in object) {
            key_counts[key] = (key_counts[key] || 0) + 1;
        }
    });
    // but then, extra requirement: delete less commonly-seen keys
    var threshold = objects.length;
    for (var key in key_counts) {
        if (key_counts[key] < threshold) {
            delete key_counts[key];
        }
    }
    return Object.keys(key_counts);
}
function objectType(object) {
    if (object === undefined) {
        return 'undefined';
    }
    if (object === null) {
        return 'null';
    }
    if (Array.isArray(object)) {
        return 'array';
    }
    return typeof object;
}
/**
Array-diffing smarter (levenshtein-like) diffing here

To get from the input ABC to the output AZ we could just delete all the input
and say "insert A, insert Z" and be done with it. That's what we do if the
input is empty. But we can be smarter.

          output
               A   Z
               -   -
          [0]  1   2
input A |  1  [0]  1
      B |  2  [1]  1
      C |  3   2  [2]

1) start at 0,0 (+0)
2) keep A (+0)
3) remove B (+1)
4) replace C with Z (+1)

if input (source) is empty, they'll all be in the top row, just a bunch of
additions. If the output is empty, everything will be in the left column, as a
bunch of deletions.
*/
function diffArrays(input, output, ptr) {
    // set up cost matrix (very simple initialization: just a map)
    var memo = {
        '0,0': { operations: [], cost: 0 }
    };
    /**
    input[i's] -> output[j's]
  
    Given the layout above, i is the row, j is the col
  
    returns a list of Operations needed to get to from input.slice(0, i) to
    output.slice(0, j), the each marked with the total cost of getting there.
    `cost` is a non-negative integer.
    Recursive.
    */
    function dist(i, j) {
        // memoized
        var memoized = memo[i + ',' + j];
        if (memoized === undefined) {
            if (compare(input[i - 1], output[j - 1])) {
                // equal (no operations => no cost)
                memoized = dist(i - 1, j - 1);
            }
            else {
                var alternatives = [];
                if (i > 0) {
                    // NOT topmost row
                    var remove_alternative = dist(i - 1, j);
                    alternatives.push({
                        // the new operation must be pushed on the end
                        operations: remove_alternative.operations.concat({
                            op: 'remove',
                            index: i - 1,
                        }),
                        cost: remove_alternative.cost + 1,
                    });
                }
                if (j > 0) {
                    // NOT leftmost column
                    var add_alternative = dist(i, j - 1);
                    alternatives.push({
                        operations: add_alternative.operations.concat({
                            op: 'add',
                            index: i - 1,
                            value: output[j - 1],
                        }),
                        cost: add_alternative.cost + 1,
                    });
                }
                if (i > 0 && j > 0) {
                    // TABLE MIDDLE
                    var replace_alternative = dist(i - 1, j - 1);
                    alternatives.push({
                        operations: replace_alternative.operations.concat({
                            op: 'replace',
                            index: i - 1,
                            value: output[j - 1],
                        }),
                        cost: replace_alternative.cost + 1,
                    });
                }
                // the only other case, i === 0 && j === 0, has already been memoized
                // the meat of the algorithm:
                // sort by cost to find the lowest one (might be several ties for lowest)
                // [4, 6, 7, 1, 2].sort(function(a, b) {return a - b;}); -> [ 1, 2, 4, 6, 7 ]
                var best = alternatives.sort((a, b) => a.cost - b.cost)[0];
                memoized = best;
            }
            memo[i + ',' + j] = memoized;
        }
        return memoized;
    }
    var array_operations = dist(input.length, output.length).operations;
    var padding = 0;
    var operations = array_operations.map(array_operation => {
        if (array_operation.op === 'add') {
            var padded_index = array_operation.index + 1 + padding;
            var index_token = padded_index < input.length ? String(padded_index) : '-';
            var operation = {
                op: array_operation.op,
                path: ptr.add(index_token).toString(),
                value: array_operation.value,
            };
            padding++; // maybe only if array_operation.index > -1 ?
            return operation;
        }
        else if (array_operation.op === 'remove') {
            var operation = {
                op: array_operation.op,
                path: ptr.add(String(array_operation.index + padding)).toString(),
            };
            padding--;
            return operation;
        }
        else {
            return {
                op: array_operation.op,
                path: ptr.add(String(array_operation.index + padding)).toString(),
                value: array_operation.value,
            };
        }
    });
    return operations;
}
function diffObjects(input, output, ptr) {
    // if a key is in input but not output -> remove it
    var operations = [];
    subtract(input, output).forEach(key => {
        operations.push({ op: 'remove', path: ptr.add(key).toString() });
    });
    // if a key is in output but not input -> add it
    subtract(output, input).forEach(key => {
        operations.push({ op: 'add', path: ptr.add(key).toString(), value: output[key] });
    });
    // if a key is in both, diff it recursively
    intersection([input, output]).forEach(key => {
        pushAll(operations, diffAny(input[key], output[key], ptr.add(key)));
    });
    return operations;
}
function diffValues(input, output, ptr) {
    var operations = [];
    if (!compare(input, output)) {
        operations.push({ op: 'replace', path: ptr.toString(), value: output });
    }
    return operations;
}
export function diffAny(input, output, ptr) {
    var input_type = objectType(input);
    var output_type = objectType(output);
    if (input_type == 'array' && output_type == 'array') {
        return diffArrays(input, output, ptr);
    }
    if (input_type == 'object' && output_type == 'object') {
        return diffObjects(input, output, ptr);
    }
    // only pairs of arrays and objects can go down a path to produce a smaller
    // diff; everything else must be wholesale replaced if inequal
    return diffValues(input, output, ptr);
}
