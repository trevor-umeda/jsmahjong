
# Player
class Player extends Backbone.Model
	initialize: ->


# Tile class
class Tile extends Backbone.Model
	initialize: ->

# The main client-side mahjong app.
# Contains the "main" function

class Mahjong
	initialize: ->

expect = chai.expect
should = chai.should()
mocha.setup "bdd"
$("document").ready ->
	mocha.globals(['Mahjong']).run()
# document ready


describe "Player", ->
	describe "sanity test", ->
		it "should exist", ->
			expect(Player).to.be.ok


describe "Tile", ->
	describe "sanity test", ->
		it "should exist", ->
			expect(Tile).to.be.ok