// Generated on 2016-06-21 using generator-web-data-connector 2.0.0

'use strict';

module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'js/*.js',
        '!js/scripts.min.js'
      ]
    },
    concat: {
      js: {
        options: {
          separator: ';'
        },
        src: [
          'bower_components/es6-promise/promise.js',
          'bower_components/jquery/dist/jquery.js',
          'bower_components/q/q.js',
          'bower_components/uri.js/src/URI.min.js',
          'bower_components/tableau/dist/*.js',
          'bower_components/tether/dist/js/tether.js',
          'bower_components/bootstrap/dist/js/bootstrap.js',
          'bower_components/wdcw/dist/wdcw.min.js',
          'src/public/*.js'
        ],
        dest: 'src/public/build/js/all.js'
      },
      css: {
        src: [
          'bower_components/bootstrap/dist/css/bootstrap.css',
          'src/public/*.css'
        ],
        dest: 'src/public/build/css/style.css'
      }
    },
    uglify: {
      options: {
        compress: true,
        mangle: true,
        sourceMap: true
      },
      target: {
        src: 'src/public/build/js/all.js',
        dest: 'src/public/build/js/all.min.js'
      }
    },
    cssmin: {
      target: {
        files: [{
          src: 'src/public/build/css/style.css',
          dest: 'src/public/build/css/style.min.css'
        }]
      }
    },
    express: {
      server: {
        options: {
          script: 'src/app.js',
          port: 9001
        }
      }
    },
    watch: {
      scripts: {
        files: 'src/**/*.js',
        tasks: [
          'jshint',
          'concat',
          'uglify'
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', [
    'build',
    'run'
  ]);

  grunt.registerTask('run', [
    'express:server',
    'watch'
  ]);

  grunt.registerTask('build', [
    'jshint',
    'concat',
    'uglify'
  ]);
};
