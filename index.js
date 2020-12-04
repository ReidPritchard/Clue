// Classes
class Game {
	constructor(people, rooms, weapons) {
		this._players = [];
		this._people = people;
		this._rooms = rooms;
		this._weapons = weapons;

		this._secret_three;
	}

	set players(inPlayers) {
		this._players = inPlayers;
	}

	get players() {
		return this._players;
	}

	get turn() {
		return this._whosTurn;
	}

	set turn(oRide) {
		// randomly set who goes first
		if (oRide != null) {
			this._whosTurn = oRide;
		} else {
			this._whosTurn = Math.floor(Math.random() * this._players.length);
		}
	}

	nextTurn() {
		this._whosTurn =
			this._whosTurn + 1 < this._players.length ? this._whosTurn + 1 : 0;
	}

	run() {
		// Ok here we go.
		//
		// The gameplay loop is something like this
		// 1) Roll Dice
		// 2) Check which rooms are in range
		// 3) if bot choose off tracker
		//    if not show options to user and capture response
		// 4) Move player to room
		// 5) if bot choose person and weapon off tracker
		//    if not show options to user and cature response
		// 6) check if any player has info & give it to the active player
		//    if bot update tracker
		// 7) update turn
		// 8) Repeat!
		let currPlayer = this._players[this.turn];
		$("#turn").get(0).innerHTML = "It is " + currPlayer.character + "'s turn";

		let d1 = Math.floor(Math.random() * 6);
		let d2 = Math.floor(Math.random() * 6);
		showDiceRoll(currPlayer.isBot, d1, d2, () => {
			let possible = currPlayer.loc.findConnections(d1 + d2);
			showPossibleRooms(possible, currPlayer.isBot, d1 + d2, (room) => {
				// let oldRoom = currPlayer.loc;
				// Leave current room
				currPlayer.leaveRoom();
				// Enter new room
				currPlayer.loc = room;
				room.enterPerson(currPlayer);

				$("#possibleRooms").remove();

				// console.log("did the room update right??", currPlayer, oldRoom, room, currPlayer.loc);

				this.displayRooms();

				// Begin accuse or suggest process
				// console.log("begin ac/sug process");
				if (!currPlayer.isBot) {
					showSuggestAccuseForm(
						currPlayer,
						this._people,
						this._weapons,
						(isAccuse, person, weapon) => {
							console.log(person, weapon, room);
							if (isAccuse == "suggest") {
								this.suggestion(person, weapon, room, () => {
									console.log("Nice, time to move on");
									setTimeout(() => {
										this.nextTurn();
										this.run();
									}, 1000);
								});
							} else {
								this.accuse(person, weapon, room, (didWin) => {
									// holy fuck did they win??
									if (didWin) {
										alert("YOU WON!!! THE GAME DOESN'T EVEN WORK WHATTT");
									} else {
										alert("You lost :( the game will now stop");
										let refresh =
											"<button class='centered' onClick='window.location.reload();'>Play again?</button>";
										$("main").append(refresh);
									}
								});
							}
						}
					);
				} else {
					setTimeout(() => {
						let person = currPlayer.tracker.pickPerson();
						let weapon = currPlayer.tracker.pickWeapon();
						let room = currPlayer.tracker.pickRoom(possible);

						// console.log("NOTHING WOKRKS");
						console.log(person, weapon, room);
						this.suggestion(person, weapon, room, () => {
							setTimeout(() => {
								this.nextTurn();
								this.run();
							}, 1000);
						});
					}, 500);
				}
			});
		});
	}

	suggestion(person, weapon, room, callback) {
		let currPlayer = this._players[this.turn];
		let player_index = this.turn + 1 < this._players.length ? this.turn + 1 : 0;

		let found = false;
		for (var c = 0; c < this.players.length - 1 && !found; c++) {
			// show this player is checking their cards
			// if they have a card
			//  show the user the card
			//  show user that a card was shown (check isBot with currPlayer)
			// if they don't say they can't help and move on
			let checkPlayer = this._players[player_index];
			let maybeCard = checkPlayer.hasCard(person, weapon, room);
			// console.log(maybeCard, checkPlayer);
			if (maybeCard) {
				console.log(maybeCard, typeof maybeCard);
				maybeCard = typeof maybeCard == "string" ? maybeCard : maybeCard.name;

				if (currPlayer.isBot) {
					showCanHelp(true, checkPlayer.character, maybeCard, () => {
						callback();
					});
				} else {
					showCanHelp(false, checkPlayer.character, maybeCard, () => {
						callback();
					});
				}
				found = true;
			} else {
				// showNoHelp(checkPlayer.character);
			}
			player_index =
				player_index < this._players.length - 1 ? player_index + 1 : 0;
		}
		if (!found && !currPlayer.isBot) {
			alert("No one can help!");
			callback();
		}
	}

	accuse(person, weapon, room, callback) {
		if (
			this._secret_three["person"] == person &&
			this._secret_three["weapon"] == weapon &&
			this._secret_three["room"] == room
		) {
			console.log("HOLY SHIT YOU DID IT");
			callback(true);
		} else {
			// End the game for you, but you're wrong :((
			callback(false);
		}
	}

	setupSecret() {
		// look into a way to make this private, so people can't cheat easily
		this._secret_three = {
			person: this._people[Math.floor(Math.random() * this._people.length)],
			weapon: this._weapons[Math.floor(Math.random() * this._weapons.length)],
			room: this._rooms[Math.floor(Math.random() * this._rooms.length)],
		};
	}

	inSecret(card) {
		if (this._secret_three["person"] == card) {
			return true;
		} else if (this._secret_three["weapon"] == card) {
			return true;
		} else if (this._secret_three["room"] == card) {
			return true;
		}
	}

	dealCards() {
		let megaList = this._people.concat(this._weapons, this._rooms);

		// console.log(megaList);
		megaList = megaList.filter((card) => {
			return !this.inSecret(card);
		});
		megaList = shuffleArray(megaList);
		// console.log(megaList);

		let player_index = 0;
		megaList.forEach((card) => {
			// console.log(card, this._players[player_index]);
			this._players[player_index].addCard(card);
			player_index =
				player_index < this._players.length - 1 ? player_index + 1 : 0;
		});

		// console.log(this.players[0]);
		displayCards(this.players[0].cards); // This should always be the user player
	}

	assignStartRooms() {
		this._players.forEach((p) => {
			let room = this._rooms[Math.floor(Math.random() * this._rooms.length)];
			room.enterPerson(p);
			p.loc = room;
		});
	}

	displayRooms() {
		// this is used to display the rooms and the people in them

		var canvas = $("#canvas");
		var context = canvas.get(0).getContext("2d");

		context.clearRect(0, 0, canvas.width, canvas.height);

		// https://www.w3schools.com/tags/canvas_arc.asp
		let maxRoomsRow = 5;

		let window_width = $(window).width();
		let window_height = $(window).height();

		let baseX = window_width * 0.1;

		let width_step = (window_width - 2 * baseX) / maxRoomsRow;

		let r = width_step / 2;

		let yOffset = 0;
		let roomCount = 0;
		this._rooms.forEach((room) => {
			// console.log(room.name);
			drawRoom(context, room, baseX, window_height / 2 + yOffset, r);

			baseX += width_step;
			roomCount++;

			if (roomCount > maxRoomsRow) {
				baseX = window_width * 0.1;
				roomCount = 0;
				yOffset += r * 2;
			}
		});
	}
}

class Room {
	constructor(name) {
		this._name = name;
		this._people = [];
		this._connections = [];
	}

	findConnections(roll) {
		let possible = [];
		this._connections.forEach((conn) => {
			if (conn.distance <= roll) {
				possible.push(conn.to);
			}
		});
		return possible;
	}

	get name() {
		return this._name;
	}

	set name(in_name) {
		this._name = in_name;
	}

	get people() {
		return this._people;
	}

	enterPerson(p) {
		this._people.push(p);
	}

	leavePerson(p) {
		this._people = this._people.filter((pp) => {
			return pp.character != p.character;
		});
	}

	get connections() {
		// Need to order this by asc distance
		return this._connections;
	}

	set connections(conns) {
		this._connections = conns;
	}
}

class Connection {
	constructor(to, distance) {
		distance || 3;

		this._to = to;
		this._distance = distance;
	}

	get distance() {
		return this._distance;
	}

	set distance(dist) {
		this._distance = dist;
	}

	get to() {
		return this._to;
	}

	set to(inTo) {
		this._to = inTo;
	}
}

class Tracker {
	constructor(characters, weapons, rooms) {
		this._characters = characters;
		this._weapons = weapons;
		this._rooms = rooms;

		this._seenChars = [];
		this._seenWeapons = [];
		this._seenRooms = [];
	}

	updateDeltCards(cards) {
		cards.forEach((card) => {
			if (this._characters.indexOf(card)) {
				this._seenChars.push(card);
			} else if (this._weapons.indexOf(card)) {
				this._seenWeapons.push(card);
			} else if (this._rooms.indexOf(card)) {
				this._seenRooms.push(card);
			}
		});
	}

	seenCard(card) {
		if (this._characters.indexOf(card)) {
			this._seenChars.push(card);
		} else if (this._weapons.indexOf(card)) {
			this._seenWeapons.push(card);
		} else if (this._rooms.indexOf(card)) {
			this._seenRooms.push(card);
		}
	}

	pickRoom(possible) {
		return possible.find((item) => this._seenRooms.indexOf(item) < 0);
	}

	pickPerson() {
		return this._characters.find((item) => this._seenChars.indexOf(item) < 0);
		// this._characters.forEach((character) => {
		// 	if (!this._seenChars.indexOf(character)) {
		// 		return character;
		// 	}
		// });
	}

	pickWeapon() {
		return this._weapons.find((item) => this._seenWeapons.indexOf(item) < 0);
		// this._weapons.forEach((weapon) => {
		// 	if (!this._seenWeapons.indexOf(weapon)) {
		// 		return weapon;
		// 	}
		// });
	}
}

class Player {
	constructor(isBot) {
		this._loc;
		this._character;
		this._cards = [];

		// If they are a bot we need to add a tracker obj
		this._isBot = isBot;
		if (isBot) {
			this._tracker = new Tracker(people, weapons, rooms);
		}
	}

	get loc() {
		return this._loc;
	}

	set loc(l) {
		this._loc = l;
	}

	get isBot() {
		return this._isBot;
	}

	get character() {
		return this._character;
	}

	set character(inChar) {
		this._character = inChar;
	}

	addCard(card) {
		this._cards.push(card);

		if (this.isBot) {
			this.tracker.seenCard(card);
		}
	}

	leaveRoom() {
		this._loc.leavePerson(this);
	}

	hasCard(person, weapon, room) {
		let found = false;
		this._cards.forEach((card) => {
			if (card === person || card === weapon || card == room) {
				found = card;
			}
		});
		return found;
	}

	get cards() {
		return this._cards;
	}

	get tracker() {
		return this._tracker;
	}
}

// Hardcoded Values

const people = [
	"Mr. Green",
	"Mrs. White",
	"Dr. Plum",
	"Ms. Scarlet",
	"General Mustard",
	"Dr. Violet",
	"Sir Lance",
	"Madam Monique",
	"Lord McLovin'",
];

const weapons = [
	"Paper Cut",
	"Revolver",
	"Candle Stick",
	"Nunchucks",
	"Pencil",
	"Peanut Allergy",
	"Deadly Stare",
];

let study = new Room("Study");
let library = new Room("Library");
let billiard = new Room("Billiard");
let conservatory = new Room("Conservatory");
let ballroom = new Room("Ballroom");
let kitchen = new Room("Kitchen");
let dining = new Room("Dining");
let lounge = new Room("Lounge");
let hall = new Room("Hall");

let studyConnections = [
	new Connection(study, 0),
	new Connection(library, 3),
	new Connection(billiard, 6),
	new Connection(conservatory, 9),
	new Connection(ballroom, 12),
	new Connection(kitchen, 1),
	new Connection(dining, 7),
	new Connection(lounge, 6),
	new Connection(hall, 3),
];
study.connections = studyConnections;

let libraryConnections = [
	new Connection(study, 3),
	new Connection(library, 0),
	new Connection(billiard, 3),
	new Connection(conservatory, 6),
	new Connection(ballroom, 9),
	new Connection(kitchen, 12),
	new Connection(dining, 7),
	new Connection(lounge, 9),
	new Connection(hall, 6),
];
library.connections = libraryConnections;

let billiardConnections = [
	new Connection(study, 6),
	new Connection(library, 3),
	new Connection(billiard, 0),
	new Connection(conservatory, 3),
	new Connection(ballroom, 6),
	new Connection(kitchen, 9),
	new Connection(dining, 9),
	new Connection(lounge, 9),
	new Connection(hall, 12),
];
billiard.connections = billiardConnections;

let conservatoryConnections = [
	new Connection(study, 9),
	new Connection(library, 6),
	new Connection(billiard, 3),
	new Connection(conservatory, 0),
	new Connection(ballroom, 3),
	new Connection(kitchen, 6),
	new Connection(dining, 9),
	new Connection(lounge, 1),
	new Connection(hall, 12),
];
conservatory.connections = conservatoryConnections;

let ballroomConnections = [
	new Connection(study, 12),
	new Connection(library, 9),
	new Connection(billiard, 6),
	new Connection(conservatory, 3),
	new Connection(ballroom, 0),
	new Connection(kitchen, 3),
	new Connection(dining, 6),
	new Connection(lounge, 9),
	new Connection(hall, 12),
];
ballroom.connections = ballroomConnections;

let kitchenConnections = [
	new Connection(study, 1),
	new Connection(library, 12),
	new Connection(billiard, 9),
	new Connection(conservatory, 6),
	new Connection(ballroom, 3),
	new Connection(kitchen, 0),
	new Connection(dining, 3),
	new Connection(lounge, 7),
	new Connection(hall, 12),
];
kitchen.connections = kitchenConnections;

let diningConnections = [
	new Connection(study, 10),
	new Connection(library, 7),
	new Connection(billiard, 12),
	new Connection(conservatory, 9),
	new Connection(ballroom, 6),
	new Connection(kitchen, 3),
	new Connection(dining, 0),
	new Connection(lounge, 4),
	new Connection(hall, 6),
];
dining.connections = diningConnections;

let loungeConnections = [
	new Connection(study, 6),
	new Connection(library, 9),
	new Connection(billiard, 12),
	new Connection(conservatory, 1),
	new Connection(ballroom, 10),
	new Connection(kitchen, 6),
	new Connection(dining, 4),
	new Connection(lounge, 0),
	new Connection(hall, 3),
];
lounge.connections = loungeConnections;

let hallConnections = [
	new Connection(study, 3),
	new Connection(library, 6),
	new Connection(billiard, 9),
	new Connection(conservatory, 12),
	new Connection(ballroom, 10),
	new Connection(kitchen, 9),
	new Connection(dining, 7),
	new Connection(lounge, 3),
	new Connection(hall, 0),
];
hall.connections = hallConnections;

let rooms = [
	study,
	library,
	billiard,
	conservatory,
	ballroom,
	kitchen,
	dining,
	lounge,
	hall,
];

// Setup (onload)

$(function () {
	// const anime = window.anime;

	// Populate char dropdown
	let char_selector = $("#characters");
	let char_html = "";
	people.forEach((c) => {
		char_html += `<option value="${c}">${c}</option>\n`;
	});
	char_selector.get(0).innerHTML = char_html;

	// Event Listeners
	let numPlayersSlider = $("#numPlayers");
	let numPlayersSlider_indicator = $("#numPlayersValue");
	numPlayersSlider.on("input", (e) => {
		anime({
			targets: numPlayersSlider_indicator[0],
			innerHTML: Number(e.currentTarget.value),
			easing: "linear",
			round: 1, // Will round the animated value to 1 decimal
			duration: 500,
		});
	});

	// Init canvas to window size
	$("#canvas").attr("width", $(window).width());
	$("#canvas").attr("height", $(window).height());

	$("#startGameButton").on("click", () => {
		runGame(numPlayersSlider.val(), char_selector.val());
	});
});

// $(window).resize(function () {
// 	$("#canvas").attr("width", $(window).width());
// 	$("#canvas").attr("height", $(window).height());
// });

// Game Functions

function runGame(numPlayers, meChar) {
	// console.log("The game is beginning!!", numPlayers);

	// First lets remove the settings
	// $("#game-settings").remove();
	anime({
		targets: "#game-settings",
		opacity: [1, 0],
		complete: () => {
			$("#game-settings").remove();
		},
	});

	// setup game
	let game = new Game(people, rooms, weapons);

	// setup players
	let allPlayers = [];
	// setup user's Player
	let me = new Player(false);
	me.character = meChar;
	allPlayers.push(me);

	let otherChars = people.filter((p) => p !== meChar);
	for (let i = 0; i < numPlayers; i++) {
		let tempPlayer = new Player(true);
		tempPlayer.character = otherChars[i];
		allPlayers.push(tempPlayer);
	}

	game.players = allPlayers;

	// finish game setup
	game.turn = 0; // For now we will overide and make the user go first everytime
	game.setupSecret();
	game.dealCards();
	game.assignStartRooms();
	game.displayRooms();

	// Begin the game!
	game.run();
}

function drawRoom(context, room, posx, posy, r) {
	// Circle
	context.beginPath();
	if (room._people.length == 0) {
		context.strokeStyle = "#888888";
	} else {
		context.strokeStyle = "#FFF";
	}
	context.arc(posx, posy, r, 0, 2 * Math.PI);
	context.stroke();
	// Text
	// https://www.w3schools.com/graphics/canvas_text.asp
	context.textAlign = "center";
	// console.log("Drawing this room's people", room);
	if (room.people.length == 0) {
		context.fillStyle = "#888888";
	} else {
		context.fillStyle = "#FFF";
		let p_off = r / 2;
		room.people.forEach((p) => {
			context.fillText(p.character, posx, posy + p_off);
			p_off += 10;
		});
	}
	context.fillText(room.name, posx, posy);
}

function showDiceRoll(isBot, d1, d2, callback) {
	var dice_html = "<div id='diceRoll'>";
	dice_html += "<div><label>Dice One: </label><div id='d1'>0</div>";
	dice_html += "<label>Dice Two: </label><div id='d2'>0</div></div>";
	if (!isBot) dice_html += "<button id='rollDie'>Roll the Dice</button>";
	dice_html += "</div>";

	// TODO: add nice animation
	$("main").append(dice_html);

	anime({
		targets: "#diceRoll",
		opacity: 1,
		delay: 3500,
		duration: 2000,
	});

	let dice1 = $("#d1");
	let dice2 = $("#d2");

	anime({
		targets: dice1.get(0),
		innerHTML: [0, 6],
		round: 1,
		easing: "linear",
		duration: 500,
		loop: true,
	});

	anime({
		targets: dice2.get(0),
		innerHTML: [0, 6],
		round: 1,
		easing: "linear",
		duration: 500,
		loop: true,
	});

	if (isBot) {
		setTimeout(() => {
			anime.remove(dice1);
			anime.remove(dice2);

			dice1.text = d1;
			dice2.text = d2;

			anime({
				targets: "#diceRoll",
				opacity: 0,
				duration: 500,
				complete: () => {
					// TODO: add nice animation
					$("#diceRoll").remove();
					callback();
				},
			});
		}, 8000);
	} else {
		$("#rollDie").on("click", () => {
			// stop animation
			anime.remove(dice1.get(0));
			anime.remove(dice2.get(0));

			// set inner html as the random value found earlier
			dice1.get(0).innerHTML = d1;
			dice2.get(0).innerHTML = d2;
			// Remove button immediatly so you can't keep clicking
			$("#diceRoll > button").remove();

			// after a little remove the dice roll window
			setTimeout(() => {
				// TODO: add nice animation
				$("#diceRoll").remove();
				callback();
			}, 2500);
		});
	}
}

function showPossibleRooms(possible, isBot, rollSum, callback) {
	// Wow arrive.js is SO nice
	// $("main").leave("#diceRoll", () => {
	var possibleHTML = "";

	possibleHTML += "<div id='possibleRooms'><h4>Possible Rooms:</h4>";
	possibleHTML += `<h5>Total roll of ${rollSum}</h5>`;

	possibleHTML += "<ul>";
	possible.forEach((room, index) => {
		possibleHTML += `<li class='roomOption'>${room.name}`;
		if (!isBot) {
			possibleHTML += `<button class='moveHere' value='${index}'>Move Here</button>`;
		}
		possibleHTML += "</li>";
	});

	possibleHTML += "</ul></div>";

	// TODO: add nice animation
	$("main").append(possibleHTML);

	if (isBot) {
		// pick room based on tracker
		setTimeout(() => {
			anime({
				targets: "#possibleRooms",
				opacity: 0,
				duration: 500,
				complete: function () {
					$("#possibleRooms").remove();
					callback(possible[Math.floor(Math.random() * possible.length)]);
				},
			});
		}, 1000);
	} else {
		// let user pick room (event listener)
		$(".moveHere").on("click", (e) => {
			// console.log(e.currentTarget.value);
			// console.log(possible[room_index]);
			let room_index = e.currentTarget.value;

			// $("#possibleRooms").remove();
			anime({
				targets: "#possibleRooms",
				opacity: 0,
				duration: 500,
				complete: function () {
					$("#possibleRooms").remove();
					callback(possible[room_index]);
				},
			});
		});
	}
	// });
}

function showSuggestAccuseForm(currPlayer, people, weapons, callback) {
	var formHTML = "";
	formHTML += "<div id='form'>";
	formHTML += "<div>";
	formHTML += '<label for="suggest">Suggest</label>';
	formHTML +=
		'<input type="radio" id="other" name="accuse" value="suggest" checked>';
	formHTML += "<br>";
	formHTML += '<label for="accuse">Accuse (final guess!)</label>';
	formHTML += '<input type="radio" id="other" name="accuse" value="accuse">';
	formHTML += "</div>";

	// Room
	formHTML += `<h5>${currPlayer.character} is in ${currPlayer.loc.name}</h5>`;

	// People
	formHTML += "<select id='people'>";
	people.forEach((p) => {
		formHTML += `<option value='${p}'>${p}</option>`;
	});
	formHTML += "</select>";
	// Weapons
	formHTML += "<select id='weapons'>";
	weapons.forEach((w) => {
		formHTML += `<option value='${w}'>${w}</option>`;
	});
	formHTML += "</select>";

	formHTML += "<button id='submit'>Submit</button>";

	formHTML += "</div>";

	$("main").append(formHTML);

	anime({
		targets: "#form",
		opacity: [0, 1],
		duration: 500,
	});

	$("#submit").on("click", () => {
		let a = $("input[name='accuse']:checked").val();
		if (a) {
			// console.log("clicked", e);
			let p = $("#people").val();
			let w = $("#weapons").val();
			// console.log(a);
			anime({
				targets: "#form",
				opacity: [0, 1],
				duration: 500,
				complete: () => {
					callback(a, p, w);
					$("#form").remove();
				},
			});
		}
	});
}

function displayCards(cards) {
	var cardsHTML = "<div id='cardView'>";
	cardsHTML += "<h4>Your Cards: </h4>";
	cardsHTML += "<ul>";

	cards.forEach((c) => {
		if (typeof c === "string") {
			cardsHTML += `<li>${c}</li>`;
		} else {
			cardsHTML += `<li>${c.name}</li>`;
		}
	});

	cardsHTML += "</ul>";
	cardsHTML += "</div>";

	$("main").append(cardsHTML);
}

function showCanHelp(isBot, helpName, card, callback) {
	console.log("showing help");
	if (isBot) {
		var canHelpHTML = "<div class='centered' id='canHelp'>";

		canHelpHTML += `<h3>${helpName} can help!</h3>`;

		canHelpHTML += "</div>";

		console.log(canHelpHTML);
		$("main").append(canHelpHTML);

		setTimeout(() => {
			$("#canHelp").remove();
			callback();
		}, 1000);
	} else {
		var canHelpHTML = "<div class='centered' id='canHelp'>";

		canHelpHTML += `<h3>${helpName} can help! They have the ${card} card.</h3>`;
		canHelpHTML += "<button id='gotIt'>Got it!</button>";

		canHelpHTML += "</div>";

		//     console.log("OKKUR");
		//     $("main").leave("#form", () => {

		// $("main").leave("#noHelp", function() {

		$("main").append(canHelpHTML);

		$("#gotIt").on("click", (e) => {
			console.log("clicked", e.currentTarget);
			$("#canHelp").remove();
			callback();
		});

		// });

		// });
	}
}

// function showNoHelp(name) {
//   let noHelpHTML = "<div class='centered' id='noHelp'>"
//   noHelpHTML += `<h3>${name} can't help :(</h3>`
//   noHelpHTML += "</div>"

//   console.log('showNoHelp');

//   console.log($("#noHelp"));
//   if ($("#noHelp").length >= 1) {
//     // $("main").leave("#noHelp", function() {
//     $("#noHelp").remove();
//     appendHTML(noHelpHTML, "#noHelp", 1000);
//     // });
//   } else {
//     appendHTML(noHelpHTML, "#noHelp", 1000);
//   }
// }

// function appendHTML(html, id, timeout) {
//   console.log('where tf is this getting called from????');
//   $("main").append(html);

//   setTimeout(() => {
//     $(id).remove();
//     return;
//   }, timeout);
// }

// Stolen from
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}
