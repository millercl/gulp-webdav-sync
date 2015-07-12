var debug = require( 'gulp-debug' )
var dav = require( './index.js' )
var gulp = require( 'gulp' )
var jscs = require( 'gulp-jscs' )
var jshint = require( 'gulp-jshint' )
var stylish = require( 'jshint-stylish' )

gulp.task( 'default', [ 'debug' ] )
gulp.task( 'test', [ 'jshint', 'jscs' ] )

gulp.task( 'debug', function () {
  gulp.src( '*' )
    .pipe( dav() )
    .pipe( debug() )
} )

gulp.task( 'jshint', function () {
  // http://jshint.com/docs/options/
  var options = {
    asi: true
    , browser: true
    , curly: true
    , esnext: true
    , indent: 2
    , jquery: false
    , laxbreak: true
    , laxcomma: true
    , newcap: true
    , node: true
  }
  return gulp.src( '*.js' )
    .pipe( jshint( options ) )
    .pipe( jshint.reporter( 'jshint-stylish' ) )
} )

gulp.task( 'jscs', function () {
  // http://jscs.info/rules.html
  var options = {
    'disallowCommaBeforeLineBreak': true
    , 'disallowEmptyBlocks': true
    , 'disallowImplicitTypeConversion': [
          'binary'
        , 'string'
    ]
    , 'disallowMixedSpacesAndTabs': true
    , 'disallowMultipleLineBreaks': true
    , 'disallowMultipleLineStrings': true
    , 'disallowMultipleVarDecl': 'exceptUndefined'
    , 'disallowNewlineBeforeBlockStatements': true
    , 'disallowOperatorBeforeLineBreak': [
          '+'
        , '.'
    ]
    , 'disallowSemicolons': true
    , 'disallowSpaceAfterPrefixUnaryOperators': [
          '++'
        , '--'
        , '+'
        , '-'
        , '~'
        , '!'
    ]
    , 'disallowSpaceBeforePostfixUnaryOperators': [
          '++'
        , '--'
    ]
    , 'disallowSpacesInCallExpression': true
    , 'disallowSpacesInNamedFunctionExpression': {
      'beforeOpeningRoundBrace': true
      , 'beforeOpeningCurlyBrace': true
    }
    , 'disallowTrailingWhitespace': true
    , 'maximumLineLength': 80
    , 'requireBlocksOnNewline': true
    , 'requireCapitalizedConstructors': true
    , 'requireCurlyBraces': [
          'if'
        , 'else'
        , 'for'
        , 'while'
        , 'do'
        , 'try'
        , 'catch'
    ]
    , 'requireKeywordsOnNewLine': [
          'if'
        , 'for'
        , 'while'
    ]
    , 'requireParenthesesAroundIIFE': true
    , 'requireSpaceAfterKeywords': [
          'do'
        , 'for'
        , 'if'
        , 'switch'
        , 'case'
        , 'try'
        , 'catch'
        , 'while'
        , 'with'
        , 'typeof'
        , 'function'
    ]
    , 'requireSpaceBeforeBinaryOperators': [
          '=='
        , '==='
        , '!='
        , '!=='
    ]
    , 'requireSpaceBeforeBlockStatements': true
    , 'requireSpaceBeforeKeywords': true
    , 'requireSpaceBetweenArguments': true
    , 'requireSpacesInAnonymousFunctionExpression': {
      'beforeOpeningRoundBrace': true
      , 'beforeOpeningCurlyBrace': true
    }
    , 'requireSpacesInConditionalExpression': true
    , 'requireSpacesInForStatement': true
    , 'requireSpacesInFunctionDeclaration': {
      'beforeOpeningCurlyBrace': true
    }
    , 'requireSpacesInFunctionExpression': {
      'beforeOpeningCurlyBrace': true
    }
    , 'requireSpacesInFunction': {
      'beforeOpeningCurlyBrace': true
    }
    , 'requireSpacesInNamedFunctionExpression': {
      'beforeOpeningCurlyBrace': true
    }
    , 'requireSpacesInsideObjectBrackets': 'all'
    , 'requireSpacesInsideParentheses': 'all'
    , 'validateIndentation': 2
    , 'validateLineBreaks': 'LF'
    , 'validateParameterSeparator': ', '
    , 'validateQuoteMarks': '\''
  }
  return gulp.src( '*.js' )
    .pipe( jscs( options ) )
} )
