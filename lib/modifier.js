'use strict'

var keypath = require('./keypath')
var Node = require('./node')

/**
 * Modifier applies the diff to the node.
 *
 * @param {Node} node
 * @api private
 */
function Modifier(node) {
    this.node = node
}

module.exports = Modifier

/**
 * Exclude properties from applying the diff.
 *
 * @type {Object}
 * @api private
 */
Modifier.EXCLUDE = {
    length: true,
    parent: true
}

/**
 * Apply the diff to the node.
 *
 * @param {Array} changes
 * @return {Modifier} this
 * @api private
 */
Modifier.prototype.apply = function(changes) {
    for (var i = 0; i < changes.length; i++) {
        var change = changes[i]
        var prop = change.path[change.path.length - 1]

        if (Modifier.EXCLUDE[prop]) continue

        var propIsNum = false
        if (!isNaN(prop)) {
            propIsNum = true
            prop = Number(prop)
        }

        var method = this[prop]

        if (!method) {
            if (propIsNum) method = this['children']
            else method = this['attributes']
        }

        method.call(this, change, prop)
    }

    return this
}

/**
 * Modify a text node.
 *
 * @param {Change} change
 */
Modifier.prototype.text = function(change) {
    return
    var nodePath = change.path.slice(0, change.path.length - 1)
    var now = change.values.now
    var node = keypath(this.node, nodePath)
    node.text = now
    node.node.textContent = now
}

Modifier.prototype.children = function(change, prop) {
    var now = change.values.now
    var node
    var nodePath

    if (change.change == 'add') {
        // Insert node at specific position.
        if (typeof prop == 'number') {
            // Find a path to the parent node.
            if (change.path.length > 1) {
                nodePath = change.path.slice(0, change.path.length - 1)
                nodePath.push(prop - 1)
                node = keypath(this.node.children, nodePath)
            } else {
                node = this.node
            }
            node.insertAt(prop, new Node(now, node))
        // Append children.
        } else {
            nodePath = change.path.slice(0, change.path.length - 1)
            node = keypath(this.tree, nodePath)
            for (key in now) {
                if (key != 'length') {
                    node.node.appendChild(
                        this.createNode(
                            now[key].name,
                            now[key].text,
                            now[key].attributes
                        )
                    )
                }
            }
        }
    } else if (change.change == 'remove') {
        this.removeNode(change.values.original.node)
    }
}

Modifier.prototype.attributes = function(change, prop) {
    var now = change.values.now

    if (change.change == 'update' || change.change == 'add') {
        var path = change.path.slice(0, change.path.length - 2)
        var node = keypath(this.node.children, path)
        node.setAttribute(prop, now)
    } else if (change.change == 'remove') {
        var path = change.path.slice(0, change.path.length - 1)
        var node = keypath(this.node.children, path)
        for (prop in change.values.original) {
            node.setAttribute(prop, null)
        }
    }
}

/**
 * Change tag name.
 */
Modifier.prototype.name = function(change, prop) {
    var path = change.path.slice(0, change.path.length - 1)
    var node = keypath(this.node.children, path)
    var now = change.values.now
    node.setName(now)
}