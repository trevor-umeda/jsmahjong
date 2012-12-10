# builds only the coffees
fs = require 'fs'
{exec} = require 'child_process'

appFiles = [
	# omit src/ and .coffee to make the below lines a little shorter
	"primitives/player" ,
	"primitives/tile" ,
	"mahjong"
]

testFiles = [
	'mahjong' ,
	"primitives/player" ,
	"primitives/tile"
]

outputDir = "out"
inputDir = "src"
specDir = "spec"

process_files = (files, callback) ->
	file_contents = new Array(remaining = files.length)
	console.log "Big content array of #{remaining} entries initialzied"
	for file, index in files then do (file, index) ->
		fs.readFile "#{file}.coffee", "utf8", (err, contents) ->
			throw err if err
			file_contents[index] = contents
			console.log "Processed the #{file} file, #{remaining-1} more to go"
			if --remaining is 0
				console.log "Processed everything, hitting the callback"
				callback(file_contents) 
			# if
		# readFile
	# for
# process_files

task "build", "Builds the client side coffee code and dumps it into the #{outputDir} directory", ->
	app_files = appFiles.map (file) -> "#{inputDir}/#{file}" 
	console.log "Processing started on the following app files #{app_files}"
	process_files app_files, (contents) ->
		fs.writeFile "#{outputDir}/app_production.coffee", contents.join("\n\n"), "utf8", (err) ->
			throw err if err
			console.log( "Finished concatenating the file" )
		# write	
	# process_files
# build

task "tests", "Builds the client side coffee code with the specs baked in and dumps into the #{outputDir} directory", ->
	app_files = appFiles.map (file) -> "#{inputDir}/#{file}" 
	console.log "Processing started on the following app files #{app_files}"
	process_files app_files, (app_contents) ->
		test_files = testFiles.map (file) -> "#{specDir}/#{file}_spec"
		console.log "Processing started on the following app files #{test_files}"
		process_files test_files, (test_contents) ->
			all_contents = app_contents.concat( test_contents ).join "\n\n"
			console.log( "concating very large file of #{all_contents.length} characters" )
			fs.writeFile "#{outputDir}/coffee_spec.coffee",all_contents, "utf8", (err) ->
				throw err if err
				console.log( "Finished concatenating the file" )
			# write	
		# process_files
	# process_files
# tests