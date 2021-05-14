const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

const PORT = 9080;

const HTML_ROOT = path.join(__dirname, '/static');
const DATA_ROOT = path.join(__dirname, '/data');

const IMG_MINE_ROOT = path.join(HTML_ROOT, '/images/Sent');
const IMG_OTHER_ROOT = path.join(HTML_ROOT, '/images');

const VID_MINE_ROOT = path.join(HTML_ROOT, '/video/Sent');
const VID_OTHER_ROOT = path.join(HTML_ROOT, '/video');

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

let img_mine = getMediaFiles(IMG_MINE_ROOT, 'IMG');
let img_other = getMediaFiles(IMG_OTHER_ROOT, 'IMG');

let vid_mine = getMediaFiles(VID_MINE_ROOT, 'VID');
let vid_other = getMediaFiles(VID_OTHER_ROOT, 'VID');

function loadChatProperties() {
	return JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'chatProps.json')));	
}

let chatProps = loadChatProperties();
console.log('Loaded properties of ' + Object.keys(chatProps).length + ' chats');

function convertDate(date) {
	// { 'date': 'DD/MM/YYYY', 'time': 'H:MM AM' } => 'YYYY-MM-DD mmmm'
	console.log(JSON.stringify(date));	
	let t = date.time.replace(' ', ':').split(':');
	let minutes = t[0] * 60 + t[1] + (t[2] == 'PM' ? 720 : 0);
	return date.date.replace(/(..)\/(..)\/(....)/, '$3-$2-$1 ') + (minutes < 1000 ? '0' : '') + minutes;
}

function getChatList() {
	let files = [];
	let i = 0;

	fs.readdirSync(DATA_ROOT)
		.filter(file => file.match(/WhatsApp Chat with .*.txt/))
		.forEach(file => {
			let name = file.replace(/^WhatsApp Chat with /, '').replace(/.txt$/, '');
			files.push({ 'id' : (i ++), 'name': name, 'props': chatProps[name] });
		});

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

function parseDate(dateString) {
	let date = {};
	date.date = dateString.substring(0, 10);
	let hour = dateString.replace(/.*, /, '').replace(/:.*/, '');
	let minute = dateString.replace(/.*:/, '').replace(/ .*/, '');
	date.time = hour + ':' + minute + ' ';
	if (dateString.includes('in the afternoon') || dateString.includes('in the evening') || (dateString.includes('in the night') && hour > 8)) {
		date.time += 'PM';
	} else {
		date.time += 'AM';
	}

	return date;
}

function getChatContents(chatName) {
	let lines = fs.readFileSync(path.join(DATA_ROOT, '/WhatsApp Chat with ' + chatName + '.txt')).toString().split(/(?:\r\n|\r|\n)/g);
	let dates = {};
	let i = 0;
	while (i < lines.length) {
		let message = {};
		// extract date and time from message line
		message.date = parseDate(lines[i].split(' - ')[0]);
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
	response.send('Hello, World!');
});

app.get('/api/chats', function (request, response) {
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify({ 'chats': getChatList() }));
});

app.get('/api/chat', function (request, response) {
	let chatName = request.query.name;
	console.log('Request for chat ' + chatName);

	let responseObject = {
		'images': {
			'mine': img_mine,
			'other': img_other
		},
		'video': {
			'mine': vid_mine,
			'other': vid_other
		},
		'messages': getChatContents(chatName)
	};

	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify(responseObject));
});

console.log('Static content at ' + HTML_ROOT);
app.use('/static', express.static(HTML_ROOT));

app.listen(PORT, console.log('Chat viewer listening on port ' + PORT));
