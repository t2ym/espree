/*
  Based on https://github.com/kesne/acorn-dynamic-import/blob/master/src/inject.js
  @license https://github.com/kesne/acorn-dynamic-import/blob/master/LICENSE
*/
/*
  Based on parseNew in https://github.com/acornjs/acorn/blob/master/src/expression.js
  @license https://github.com/acornjs/acorn/blob/master/LICENSE
*/

/* eslint-disable no-underscore-dangle */

"use strict";

/**
 * Inject importMeta plugin
 * @param {acorn} acorn Acorn parser object
 * @returns {acorn} Acorn parser object with injected importMeta plugin
 */
function injectImportMeta(acorn) {
    var tt = acorn.tokTypes;

    // NOTE: This allows `yield import()` to parse correctly.
    tt._import.startsExpr = true;

    /**
     * Parse import.meta MetaProperty
     * @this {acorn}
     * @returns {ASTNode} Parsed MetaProperty AST Node
     */
    function parseImportMeta() {
        var node = this.startNode();
        var meta = this.parseIdent(true);
        if (this.type !== tt.dot) {
            this.unexpected();
        }
        this.next();
        node.meta = meta;
        let containsEsc = this.containsEsc;
        node.property = this.parseIdent(true);
        if (node.property.name !== "meta" || containsEsc) {
            this.raiseRecoverable(node.property.start, "The only valid meta property for import is import.meta");
        }
        return this.finishNode(node, "MetaProperty");
    }

    /**
     * Find the next non-whitespace token at this.input[this.pos]
     * @this {acorn}
     * @returns {string} The next non-whitespace character since this.input[this.pos]
     */
    function peekNext() {
        let next = this.input[this.pos];
        if (" \t\n".indexOf(next) >= 0) {
            let pos = this.pos;
            while (" \t\n".indexOf(next = this.input[pos]) >= 0) {
                pos++;
            }
        }
        return next;
    }

    // eslint-disable-next-line no-param-reassign
    acorn.plugins.importMeta = (function() {
        /**
         * Inject import.meta parser to Acorn
         * @param {acorn} instance Acorn object
         * @returns {undefined}
         */
        function importMetaPlugin(instance) {
            instance.extend("parseStatement", function(nextMethod) {
                return (function() {
                    /**
                     * Parse a statement starting with import.meta
                     * @this {acorn}
                     * @returns {ASTNode} nextMethod() result
                     */
                    function parseStatement() {
                        if (this.type === tt._import && peekNext.call(this) === ".") {
                            return this.parseExpressionStatement(this.startNode(), this.parseExpression());
                        }

                        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                            args[_key] = arguments[_key];
                        }

                        return nextMethod.apply(this, args);
                    }

                    return parseStatement;
                }());
            });

            instance.extend("parseExprAtom", function(nextMethod) {
                return (function() {
                    /**
                     * Parse an expression starting with import.meta
                     * @param {Object} refDestructuringErrors ?
                     * @this {acorn}
                     * @returns {ASTNode} nextMethod() result
                     */
                    function parseExprAtom(refDestructuringErrors) {
                        if (this.type === tt._import && peekNext.call(this) === ".") {
                            return parseImportMeta.call(this);
                        }
                        return nextMethod.call(this, refDestructuringErrors);
                    }

                    return parseExprAtom;
                }());
            });
        }

        return importMetaPlugin;
    }());

    return acorn;
}

module.exports = injectImportMeta;
