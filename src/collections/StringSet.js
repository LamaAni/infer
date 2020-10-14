/**
 * @param {any} obj the obj.
 * @return {boolean} true of the object is iterable.
 */
function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) return false

  return typeof obj[Symbol.iterator] === 'function'
}

/**
 * A collection of unqiue string values. This collection
 * is much faster then normal Set.
 * @param {StringSet|Set|string[]|string} vals the values to initialize with.
 */
class StringSet {
  constructor(vals) {
    this.clear()

    /**
     * the internal cache collection.
     * @property {Object}*/
    this.cache = {}

    if (vals == null) return

    if (isIterable(vals)) vals = Array.from(vals)

    if (Array.isArray(vals)) {
      for (let i = 0; i < vals.length; i++) this.add(vals[i])
    } else {
      this.add(vals)
    }
  }

  /**
   * Invalidates the internal colection cache, for internal use
   * @private
   */
  _invalidateCache() {
    // call to invalidate the current object cache.
    this.cache = {}
  }

  /**
   * All the values in the collection.
   * @return {string[]}
   */
  get Values() {
    if (this.cache.values == null) this.cache.values = Object.keys(this._vals)

    return this.cache.values
  }

  /**
   * The number of elements in the collection (added to support Set like)
   * @return {number}
   */
  get size() {
    return this.Values.length
  }

  /**
   * The number of elements in the collection (added to support Array like)
   * @return {number}
   */
  get length() {
    return this.Values.length
  }

  /**
   * Check if the key is in the colelciton
   * @param {string} value
   * @return {boolena} true if the key is in the colelciton otherwise false.
   */
  has(value) {
    // eslint-disable-next-line no-prototype-builtins
    return this._vals.hasOwnProperty(value)
  }

  /**
   * Adds a value to the collection if the value dose not exist.
   * @param {string} value
   * @return {StringSet} this set.
   */
  add(value) {
    if (this.has(value)) return
    this._vals[value] = true
    this._invalidateCache()
    return this
  }

  /**
   * Clears the collection.
   * @return {StringSet} this set.
   */
  clear() {
    this._vals = {}
    this._invalidateCache()
    return this
  }

  /**
   * Removes a value from the collection.
   * @param {string} value
   * @return {StringSet} this set.
   */
  delete(value) {
    if (!this.has(value)) return
    delete this._vals[value]
    this._invalidateCache()
    return this
  }

  /**
   * Returns all the values in the collection using the value iterator.
   * @return {string[]}
   */
  entries() {
    return this[Symbol.iterator]()
  }

  /**
   * The array foreach iterator.
   * @augments Array.prototype.forEach
   */
  forEach(...args) {
    Array.prototype.forEach.apply(this.Values, args)
  }

  /**
   * The array join function.
   * @param {string} separator
   */
  join(separator) {
    return this.Values.join(separator)
  }

  /**
   * The values map function
   * @return {string[]}
   * @augments Array.prototype.map
   */
  map(...args) {
    return Array.prototype.map.apply(this.Values, args)
  }

  /**
   * The (Values) array iterator.
   * @extends {Array.prototype[Symbol.iterator]}
   * @return {Symbol.iterator} the iterator
   */
  [Symbol.iterator]() {
    return this.Values[Symbol.iterator]()
  }

  /**
   * Union this set with another set.
   * @param {StringSet|string[]} other
   * @return {StringSet} this set.
   */
  union(other) {
    if (other instanceof StringSet) other = other.Values
    else if (!isIterable(other))
      throw new Error('The collection must be iteratable')
    else other = Array.isArray(other) ? other : Array.from(other)

    for (let i = 0; i < other.length; i++) this.add(other[i])

    return this
  }

  /**
   * Intersect this set with another set.
   * @param {StringSet|string[]} other
   * @return {StringSet} this set.
   */
  intersect(other) {
    if (!(other instanceof StringSet)) other = new StringSet(other)

    const vals = this.Values
    this.clear()

    for (let i = 0; i < vals.length; i++) {
      if (other.has(vals[i])) this.add(vals[i])
    }

    return this
  }

  /**
   * Same as this Values.toJSON.
   * @return {string[]} As json OBJECT.
   */
  toJSON() {
    return this.Values
  }

  /**
   * Same as this Values.toString.
   * @return {string}
   */
  toString() {
    return this.Values.toString()
  }
}

module.exports = StringSet
