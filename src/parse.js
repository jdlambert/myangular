'use strict';

function parse(expr) {
    var lexer = new Lexer();
    var parser = new Parser(lexer);
    return parser.parse(expr);
}

module.exports = parse;

function Lexer() {

}

Lexer.prototype.lex = function(text) {
    // Tokenization will be done here
};

function AST(lexer) {
    this.lexer = lexer;
}

ASt.prototype.ast = function(text) {
    this.tokens = this.lexer.lex(text);
    // AST building will be done here
};

function ASTCompiler(astBuilder) {
    this.astBuilder = astBuilder;
}


ASTCompiler.prototype.compile = function(text) {
    var ast = this.astBuilder.ast(text);
    // AST compilation will be done here
};

function Parser(lexer) {
    this.lexer = lexer;
    this.ast = new ASt(this.lexer);
    this.astCompiler = newASTCompiler(this.ast);
}

Parser.prototype.parse = function(text) {
    return this.astCompiler.compile(text);
}
