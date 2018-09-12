import { TreeIterator, ENTRIES, KEYS, VALUES, LEAF } from './TreeIterator.js'
import fuzzySearch from './fuzzySearch.js'

class RadixTree {
  constructor (tree = {}, prefix = '') {
    this._tree = tree
    this._prefix = prefix
  }

  atPrefix (prefix) {
    if (!prefix.startsWith(this._prefix)) { throw new Error('Mismatched prefix') }
    const [node, path] = trackDown(this._tree, prefix.slice(this._prefix.length))
    if (node === undefined) {
      const [parentNode, key] = last(path)
      const nodeKey = Object.keys(parentNode).find(k => k !== LEAF && k.startsWith(key))
      if (nodeKey !== undefined) {
        return new RadixTree({ [nodeKey.slice(key.length)]: parentNode[nodeKey] }, prefix)
      }
    }
    return new RadixTree(node || {}, prefix)
  }

  clear () {
    delete this._size
    this._tree = {}
  }

  delete (key) {
    delete this._size
    return remove(this._tree, key)
  }

  entries () {
    return new TreeIterator(this, ENTRIES)
  }

  forEach (fn) {
    for (let [key, value] of this) {
      fn(key, value, this)
    }
  }

  fuzzyGet (key, maxEditDistance) {
    return fuzzySearch(this._tree, key, maxEditDistance)
  }

  get (key) {
    const node = lookup(this._tree, key)
    return node !== undefined ? node[LEAF] : undefined
  }

  has (key) {
    const node = lookup(this._tree, key)
    return node !== undefined && node.hasOwnProperty(LEAF)
  }

  keys () {
    return new TreeIterator(this, KEYS)
  }

  set (key, value = true) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = value
    return this
  }

  get size () {
    if (this._size) { return this._size }
    this._size = 0
    this.forEach(() => { this._size += 1 })
    return this._size
  }

  update (key, fn) {
    if (typeof key !== 'string') { throw new Error('key must be a string') }
    delete this._size
    const node = createPath(this._tree, key)
    node[LEAF] = fn(node[LEAF])
    return this
  }

  values () {
    return new TreeIterator(this, VALUES)
  }

  [Symbol.iterator] () {
    return this.entries()
  }
}

RadixTree.from = function (entries) {
  const tree = new RadixTree()
  for (let [key, value] of entries) {
    tree.set(key, value)
  }
  return tree
}

RadixTree.fromObject = function (object) {
  return RadixTree.from(Object.entries(object))
}

const trackDown = function (tree, key, path = []) {
  if (key.length === 0) { return [tree, path] }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) { return trackDown(undefined, '', [...path, [tree, key]]) }
  return trackDown(tree[nodeKey], key.slice(nodeKey.length), [...path, [tree, nodeKey]])
}

const lookup = function (tree, key) {
  if (key.length === 0) { return tree }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) { return undefined }
  return lookup(tree[nodeKey], key.slice(nodeKey.length))
}

const createPath = function (tree, key) {
  if (key.length === 0) { return tree }
  const nodeKey = Object.keys(tree).find(k => k !== LEAF && key.startsWith(k))
  if (nodeKey === undefined) {
    const toSplit = Object.keys(tree).find(k => k !== LEAF && k.startsWith(key[0]))
    if (toSplit === undefined) {
      tree[key] = {}
    } else {
      const prefix = commonPrefix(key, toSplit)
      tree[prefix] = { [toSplit.slice(prefix.length)]: tree[toSplit] }
      delete tree[toSplit]
      return createPath(tree[prefix], key.slice(prefix.length))
    }
    return tree[key]
  }
  return createPath(tree[nodeKey], key.slice(nodeKey.length))
}

const commonPrefix = function (a, b, i = 0, length = Math.min(a.length, b.length), prefix = '') {
  if (i >= length) { return prefix }
  if (a[i] !== b[i]) { return prefix }
  return commonPrefix(a, b, i + 1, length, prefix + a[i])
}

const remove = function (tree, key) {
  const [node, path] = trackDown(tree, key)
  if (node === undefined) { return }
  delete node[LEAF]
  const keys = Object.keys(node)
  if (keys.length === 0) { cleanup(path) }
  if (keys.length === 1) { merge(path, keys[0], node[keys[0]]) }
}

const cleanup = function (path) {
  if (path.length === 0) { return }
  const [node, key] = last(path)
  delete node[key]
  if (Object.keys(node).length === 0) {
    cleanup(path.slice(0, -1))
  }
}

const merge = function (path, key, value) {
  if (path.length === 0) { return }
  const [node, nodeKey] = last(path)
  node[nodeKey + key] = value
  delete node[nodeKey]
}

const last = function (array) {
  return array[array.length - 1]
}

export default RadixTree
export { RadixTree }