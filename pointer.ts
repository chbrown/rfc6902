/**
Unescape token part of a JSON Pointer string

`token` should *not* contain any '/' characters.

> Evaluation of each reference token begins by decoding any escaped
> character sequence.  This is performed by first transforming any
> occurrence of the sequence '~1' to '/', and then transforming any
> occurrence of the sequence '~0' to '~'.  By performing the
> substitutions in this order, an implementation avoids the error of
> turning '~01' first into '~1' and then into '/', which would be
> incorrect (the string '~01' correctly becomes '~1' after
> transformation).

Here's my take:

~1 is unescaped with higher priority than ~0 because it is a lower-order escape character.
I say "lower order" because '/' needs escaping due to the JSON Pointer serialization technique.
Whereas, '~' is escaped because escaping '/' uses the '~' character.
*/
export function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

/** Escape token part of a JSON Pointer string

> '~' needs to be encoded as '~0' and '/'
> needs to be encoded as '~1' when these characters appear in a
> reference token.

This is the exact inverse of `unescapeToken()`, so the reverse replacements must take place in reverse order.
*/
export function escapeToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1')
}

export interface PointerEvaluation {
  parent: any
  key: string
  value: any
}

/**
JSON Pointer representation
*/
export class Pointer {
  constructor(public tokens = ['']) { }
  /**
  `path` *must* be a properly escaped string.
  */
  static fromJSON(path: string): Pointer {
    const tokens = path.split('/').map(unescapeToken)
    if (tokens[0] !== '') throw new Error(`Invalid JSON Pointer: ${path}`)
    return new Pointer(tokens)
  }
  toString(): string {
    return this.tokens.map(escapeToken).join('/')
  }
  /**
  Returns an object with 'parent', 'key', and 'value' properties.
  In the special case that this Pointer's path == "",
  this object will be {parent: null, key: '', value: object}.
  Otherwise, parent and key will have the property such that parent[key] == value.
  */
  evaluate(object: any): PointerEvaluation {
    let parent: any = null
    let key = ''
    let value = object
    for (let i = 1, l = this.tokens.length; i < l; i++) {
      parent = value
      key = this.tokens[i]
      if (key == '__proto__' || key == 'constructor' || key == 'prototype') {
        continue
      }
      // not sure if this the best way to handle non-existant paths...
      value = (parent || {})[key]
    }
    return {parent, key, value}
  }
  get(object: any): any {
    return this.evaluate(object).value
  }
  set(object: any, value: any): void {
    const endpoint = this.evaluate(object)
    if (endpoint.parent) {
      endpoint.parent[endpoint.key] = value
    }
  }
  push(token: string): void {
    // mutable
    this.tokens.push(token)
  }
  /**
  `token` should be a String. It'll be coerced to one anyway.

  immutable (shallowly)
  */
  add(token: string): Pointer {
    const tokens = this.tokens.concat(String(token))
    return new Pointer(tokens)
  }
}
