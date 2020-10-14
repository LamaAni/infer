function object_equals(a, b) {
  if (a == null || b == null || typeof a != 'object' || typeof b != 'object') {
    return a === b
  }

  if (!(a instanceof b.constructor || b instanceof a.constructor)) return false

  const a_keys = Object.keys(a)
  const b_keys = Object.keys(b)
  if (a_keys.length != b_keys.length) return false

  for (const key in a) {
    if (!object_equals(a[key], b[key])) return false
  }
  return true
}

module.exports = object_equals
