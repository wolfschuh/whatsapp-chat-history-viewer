const express = require('express');
const path = require('path');
const fs = require('fs');

const common = require('./common');

const app = express();

const PORT = 9080;

const HTML_ROOT = path.join(__dirname, '/static');
const DATA_ROOT = path.join(__dirname, '/data');

const IMG_MINE_ROOT = path.join(HTML_ROOT, '/images/Sent');
const IMG_OTHER_ROOT = path.join(HTML_ROOT, '/images');

const VID_MINE_ROOT = path.join(HTML_ROOT, '/video/Sent');
const VID_OTHER_ROOT = path.join(HTML_ROOT, '/video');

const CHAT_PROPERTIES_FILE = path.join(DATA_ROOT, 'chatProps.json');

function convertDateString(dateStr) {
	// YYYYMMDD -> DD/MM/YYYY
	return dateStr.substring(6, 8) + '/' + dateStr.substring(4, 6) + '/' + dateStr.substring(0, 4);
}

function getMediaFiles(mediaRoot, prefix) {
	let dates = {};

	fs.readdirSync(mediaRoot)
		.filter(file => file.match(new RegExp('^' + prefix + '-.*')))
		.forEach(file => {
			let curDate = convertDateString(file.split('-')[1]);
			if (!dates[curDate]) {
				dates[curDate] = { 'files': [] };
			}
			dates[curDate].files.push(file);
		});

	console.log('Loaded files from ' + mediaRoot + ' for ' + Object.keys(dates).length + ' dates');
	return dates;
}

let myImages = getMediaFiles(IMG_MINE_ROOT, 'IMG');
let otherImages = getMediaFiles(IMG_OTHER_ROOT, 'IMG');

let myVideos = getMediaFiles(VID_MINE_ROOT, 'VID');
let otherVideos = getMediaFiles(VID_OTHER_ROOT, 'VID');

function loadChatProperties() {
	return JSON.parse(fs.readFileSync(CHAT_PROPERTIES_FILE));	
}

let chatProps = loadChatProperties();
console.log('Loaded properties of ' + Object.keys(chatProps).length + ' chats');

// converts internal date to a sortable format
function convertDate(date) {
	// { 'date': 'DD/MM/YYYY', 'time': 'H:MM AM' } => 'YYYY-MM-DD mmmm'
	let t = date.time.replace(' ', ':').split(':');
	let minutes = t[0] * 60 + t[1] + (t[2] == 'PM' ? 720 : 0);
	return date.date.replace(/(..)\/(..)\/(....)/, '$3-$2-$1 ') + (minutes < 1000 ? '0' : '') + minutes;
}

function getSortedChatList() {
	let files = common.getChatList(DATA_ROOT);
	
	files.forEach(chat => { chat.props = chatProps[chat.name]; });

	// sort chat list by last date
	files.sort((a, b) => {
		if (!a.props.date) {
			return 1;
		}
		else if (!b.props.date) {
			return -1;
		}
		else {
			return convertDate(b.props.date).localeCompare(convertDate(a.props.date));
		}
	});

	return files;
}

function getChatContents(chatName) {
	let lines = fs.readFileSync(path.join(DATA_ROOT, '/WhatsApp Chat with ' + chatName + '.txt')).toString().split(/(?:\r\n|\r|\n)/g);
	let dates = {};
	let i = 0;
	while (i < lines.length) {
		let message = {};
		// extract date and time from message line
		message.date = common.parseDate(lines[i].split(' - ')[0]);
		let text = [];
		text.push(lines[i].replace(/[^-]* - /, ''));
		// extract message sender
		if (text[0].includes(':')) {
			message.person = text[0].split(':')[0];
			message.myself = (message.person == 'Wolfgang');
			text[0] = text[0].replace(/[^:]*: /, '');
		}
		let j = i + 1;
		// handle multiline messages
		while (j < lines.length && !lines[j].match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9].*/)) {
			text.push(lines[j]);
			j ++;
		}
		message.text = text;
		if (!dates[message.date.date]) {
			dates[message.date.date] = [];
		}
		dates[message.date.date].push(message);
		i = j;
	}
	return dates;
}	

app.get('/', function (request, response) {
	response.redirect('/static/chat-viewer.html');
});

app.get('/api/chats', function (request, response) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({ 'chats': getSortedChatList() }));
});

app.get('/api/chat', function (request, response) {
	let chatName = request.query.name;
	console.log('Request for chat ' + chatName);

	let responseObject = {
		'images': {
			'mine': myImages,
			'other': otherImages
		},
		'video': {
			'mine': myVideos,
			'other': otherVideos
		},
		'messages': getChatContents(chatName)
	};

	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify(responseObject));
});

console.log('Static content at ' + HTML_ROOT);
app.use('/static', express.static(HTML_ROOT));

app.listen(PORT, console.log('Chat viewer listening on port ' + PORT));
