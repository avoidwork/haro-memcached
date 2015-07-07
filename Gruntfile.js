module.exports = function (grunt) {
	grunt.initConfig({
		pkg : grunt.file.readJSON("package.json"),
		concat: {
			options : {
				banner : "/**\n" +
				" * <%= pkg.description %>\n" +
				" *\n" +
				" * @author <%= pkg.author %>\n" +
				" * @copyright <%= grunt.template.today('yyyy') %>\n" +
				" * @license <%= pkg.license %>\n" +
				" * @link <%= pkg.homepage %>\n" +
				" * @version <%= pkg.version %>\n" +
				" */\n"
			},
			dist: {
				src : [
					"src/index.js"
				],
				dest : "lib/index.es6.js"
			}
		},
		babel: {
			options: {
				sourceMap: false
			},
			dist: {
				files: {
					"lib/index.js": "lib/index.es6.js"
				}
			}
		},
		eslint: {
			target: ["lib/index.es6.js"]
		},
		nodeunit : {
			all : ["test/*.js"]
		},
		watch : {
			grunt: {
				files : "Gruntfile.js",
				tasks : "default"
			},
			js : {
				files : "<%= concat.dist.src %>",
				tasks : "default"
			},
			pkg: {
				files : "package.json",
				tasks : "default"
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-nodeunit");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-babel");
	grunt.loadNpmTasks("grunt-eslint");

	// aliases
	grunt.registerTask("test", ["eslint", "nodeunit"]);
	grunt.registerTask("build", ["concat", "babel"]);
	grunt.registerTask("default", ["build", "test"]);
};