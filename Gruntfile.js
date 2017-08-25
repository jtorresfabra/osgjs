'use strict';

var fs = require('fs');
var path = require('path');

var webpackConfig = require('./webpack.config.js');

var extend = require('extend');
var glob = require('glob');

// var jshintrc = JSON.parse( fs.readFileSync( './.jshintrc' ).toString() );

// Base paths used by the tasks.
// They always have to finish with a '/'.
//
var SOURCE_PATH = 'sources/';
var EXAMPLE_PATH = 'examples/';
var BUILD_PATH = 'builds/';
var TEST_PATH = 'tests/';
var BENCHMARK_PATH = 'benchmarks/';
var DIST_PATH = path.join(BUILD_PATH, 'dist/');

var eslintConfigFilename = './.eslintrc.json';
// Utility functions
var find = function(cwd, pattern) {
    if (typeof pattern === 'undefined') {
        pattern = cwd;
        cwd = undefined;
    }

    var isEntity = function(pathname) {
        if (cwd) pathname = path.join(cwd, pathname);
        return !fs.lstatSync(pathname).isDirectory();
    };

    var options = {};

    if (cwd) options.cwd = cwd;

    return glob.sync(pattern, options).filter(isEntity);
};

// get source file once and for all, caching results.
var srcFiles = find(SOURCE_PATH, '**/*.js').map(function(pathname) {
    return pathname;
});

var exampleFiles = find(EXAMPLE_PATH, '**/*.js').map(function(pathname) {
    return pathname;
});

var testFiles = find(TEST_PATH, '**/*.js').map(function(pathname) {
    return pathname;
});

var benchmarkFiles = find(BENCHMARK_PATH, '**/*.js').map(function(pathname) {
    return pathname;
});

// Used to store all Grunt tasks
//
var gruntTasks = {};

// ## Top-level configurations
//
(function() {
    gruntTasks.eslint = {
        options: {
            configFile: eslintConfigFilename
        }
    };

    //build/bundle
    gruntTasks.copy = {
        options: {}
    };

    gruntTasks.clean = {
        options: {}
    };

    //tests
    gruntTasks.qunit = {};

    gruntTasks.connect = {};
})();

// ## Webpack
//
// Build OSGJS with webpack
//
(function() {
    var webpack = require('webpack');

    var targets = {
        build: {
            devtool: 'source-map',
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        loader: 'webpack-strip-block'
                    }
                ]
            }
        },

        builddebug: {
            devtool: 'eval-source-map'
        },

        buildrelease: {
            devtool: null,
            output: {
                path: DIST_PATH,
                filename: '[name].min.js',
                libraryTarget: 'umd',
                library: 'OSG'
            },

            loaders: [
                {
                    test: /\.js$/,
                    loader: 'webpack-strip-block'
                }
            ],
            // additional plugins for this specific mode
            plugins: [
                new webpack.optimize.UglifyJsPlugin({
                    sourceMap: false
                })
            ]
        }
    };

    gruntTasks.webpack = {
        options: webpackConfig,
        build: targets.build,
        buildrelease: targets.buildrelease,
        builddebug: targets.builddebug,
        watch: {
            entry: targets.build.entry,
            devtool: targets.build.devtool,

            // use webpacks watcher
            // You need to keep the grunt process alive
            watch: true,
            keepalive: true
        }
    };
})();

// ## ESLint
//
// Will check the Gruntfile and every "*.js" file in the "statics/sources/" folder.
//
(function() {
    gruntTasks.eslint.self = {
        options: {
            node: true
        },
        src: ['Gruntfile.js', 'webpack.config.js']
    };

    gruntTasks.eslint.sources = {
        options: {
            browser: true
        },
        src: srcFiles
            .filter(function(pathName) {
                return (
                    pathName.indexOf('glMatrix') === -1 &&
                    pathName.indexOf('webgl-debug.js') === -1 &&
                    pathName.indexOf('webgl-utils.js') === -1
                );
            })
            .map(function(pathname) {
                return path.join(SOURCE_PATH, pathname);
            })
    };

    gruntTasks.eslint.examples = {
        options: {
            browser: true
        },
        src: exampleFiles.map(function(pathname) {
            return path.join(EXAMPLE_PATH, pathname);
        })
    };

    gruntTasks.eslint.tests = {
        options: {
            browser: true
        },
        src: testFiles
            .filter(function(pathName) {
                return pathName.indexOf('glMatrix') === -1;
            })
            .map(function(pathname) {
                return path.join(TEST_PATH, pathname);
            })
    };

    gruntTasks.eslint.benchmarks = {
        options: {
            browser: true
        },
        src: benchmarkFiles.map(function(pathname) {
            return path.join(BENCHMARK_PATH, pathname);
        })
    };
})();

// ## Clean
//
(function() {
    gruntTasks.clean.staticWeb = {
        src: [path.join(BUILD_PATH, 'web')]
    };
})();

function buildPrettierOptions(grunt) {
    var filesList = [];
    ['tests', 'examples', 'sources', 'self', 'benchmarks'].forEach(function(target) {
        filesList = filesList.concat(gruntTasks.eslint[target].src);
    });

    var eslintConfigObject = grunt.file.readJSON(eslintConfigFilename);
    var prettierConfig = eslintConfigObject.rules['prettier/prettier'][1];
    var prettierOptions = ['--write'];

    prettierOptions.push('--print-width', prettierConfig.printWidth);
    if (prettierConfig.singleQuote) prettierOptions.push('--single-quote');
    if (prettierConfig.tabWidth) prettierOptions.push('--tab-width', prettierConfig.tabWidth);
    if (prettierConfig.jsxBracketSameLine) prettierOptions.push('--jsx-bracket-same-line');
    if (prettierConfig.trailingComma)
        prettierOptions.push('--trailing-comma', prettierConfig.trailingComma);
    if (prettierConfig.bracketSpacing !== undefined)
        prettierOptions.push('--bracket-spacing', prettierConfig.bracketSpacing);

    Array.prototype.push.apply(prettierOptions, filesList);
    var prettierArgs = prettierOptions;

    gruntTasks.execute.prettier = {
        options: {
            args: prettierArgs
        },
        src: ['node_modules/.bin/prettier']
    };
}

(function() {
    gruntTasks.execute = {
        test: {
            src: ['tests/runTests.js']
        },
        bench: {
            src: ['benchmarks/runBenchmarks.js']
        }
    };
})();

// ## Documentation
//
(function() {
    gruntTasks.documentation = {
        default: {
            files: [
                {
                    expand: true,
                    cwd: 'sources',
                    src: ['**/*.js']
                }
            ],
            options: {
                destination: 'docs'
            }
        }
    };
})();

// ## Plato
(function() {
    gruntTasks.plato = {
        options: {
            // Task-specific options go here.
        },
        main: {
            files: {
                'docs/analysis': srcFiles.map(function(pathname) {
                    return path.join(SOURCE_PATH, pathname);
                })
            }
        }
    };
})();

// ## connect
//
(function() {
    // will start a server on port 9001 with root directory at the same level of
    // the grunt file
    var currentDirectory = path.dirname(path.resolve('./Gruntfile.js', './'));
    gruntTasks.connect = {
        server: {
            options: {
                port: 9001,
                hostname: 'localhost'
            }
        },
        dist: {
            options: {
                port: 9000,
                directory: currentDirectory,
                hostname: 'localhost',
                open: true,
                middleware: function(connect, options, middlewares) {
                    // inject a custom middleware into the array of default middlewares
                    middlewares.unshift(function(req, res, next) {
                        var ext = path.extname(req.url);
                        if (ext === '.gz') {
                            res.setHeader('Content-Type', 'text/plain');
                            res.setHeader('Content-Encoding', 'gzip');
                        }

                        return next();
                    });

                    return middlewares;
                }
            }
        }
    };
})();

(function() {
    gruntTasks.release = {
        options: {
            npm: false
        }
    };
})();

/* eslint-disable camelcase */
(function() {
    gruntTasks.update_submodules = {
        default: {
            options: {
                // default command line parameters will be used: --init --recursive
            }
        }
    };
})();

/* eslint-enable camelcase */

(function() {
    gruntTasks.copy = {
        staticWeb: {
            files: [
                {
                    expand: true,
                    src: ['sources/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    src: ['docs/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    src: ['examples/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    src: ['tests/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    src: ['tutorials/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    src: ['benchmarks/**'],
                    dest: path.join(BUILD_PATH, 'web/')
                },
                {
                    expand: true,
                    cwd: 'builds',
                    src: ['dist/**'],
                    dest: path.join(BUILD_PATH, 'web/builds/')
                },
                {
                    expand: true,
                    cwd: 'builds',
                    src: ['active/**'],
                    dest: path.join(BUILD_PATH, 'web/builds/')
                }
            ]
        },
        bundles: {
            files: [
                {
                    expand: true,
                    src: 'builds/dist/OSG.min.js',
                    rename: function () {
                        return 'builds/dist/OSG.js'; // The function must return a string with the complete destination
                    }
                },
                {
                    expand: true,
                    src: 'builds/dist/tests.min.js',
                    rename: function () {
                        return 'builds/dist/tests.js'; // The function must return a string with the complete destination
                    }
                },
                {
                    expand: true,
                    src: 'builds/dist/benchmarks.min.js',
                    rename: function () {
                        return 'builds/dist/benchmarks.js'; // The function must return a string with the complete destination
                    }
                }
            ]
        }
    };
})();

module.exports = function(grunt) {
    var distFullPath = path.normalize(path.join(__dirname, DIST_PATH)); // eslint-disable-line no-undef
    grunt.file.mkdir(distFullPath);

    // use same options as eslintrc for prettier
    buildPrettierOptions(grunt);

    grunt.initConfig(
        extend(
            {
                pkg: grunt.file.readJSON('package.json')
            },
            gruntTasks
        )
    );

    grunt.loadNpmTasks('grunt-documentation');

    grunt.loadNpmTasks('grunt-plato');

    grunt.loadNpmTasks('grunt-release');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-update-submodules');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-webpack');

    grunt.loadNpmTasks('grunt-execute');

    grunt.registerTask('watch', ['webpack:watch']);
    grunt.registerTask('check', [
        'eslint:self',
        'eslint:sources',
        'eslint:examples',
        'eslint:tests',
        'eslint:benchmarks'
    ]);

    grunt.registerTask('prettier', ['execute:prettier']);

    grunt.registerTask('sync', ['update_submodules:default']);

    grunt.registerTask('test', ['execute:test']);
    grunt.registerTask('benchmarks', ['execute:bench']);

    grunt.registerTask('build', ['webpack:build']);
    grunt.registerTask('build-release', ['webpack:buildrelease', 'copy:bundles']);
    grunt.registerTask('build-debug', ['webpack:builddebug']);

    grunt.registerTask('docs', ['plato', 'documentation:default']);
    grunt.registerTask('default', ['check', 'build']);
    grunt.registerTask('serve', ['sync', 'build', 'connect:dist:keepalive']);
};
