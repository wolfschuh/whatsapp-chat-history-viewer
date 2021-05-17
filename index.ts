import express from "express";
import * as path from "path";
import * as fs from "fs";

import { DateObj, MessageProps, ChatProps, parseDate, getChatList, FileObj } from "./common";

// not recommended by stackoverflow, but works
const chatProps : ChatProps = require('./data/chatProps.json');

const app = express();

const PORT : number = 9080;

const HTML_ROOT : string = path.join(__dirname, '/static');
const DATA_ROOT : string = path.join(__dirname, '/data');

const IMG_MINE_ROOT : string = path.join(HTML_ROOT, '/images/Sent');
const IMG_OTHER_ROOT : string = path.join(HTML_ROOT, '/images');

const VID_MINE_ROOT : string = path.join(HTML_ROOT, '/video/Sent');
const VID_OTHER_ROOT : string = path.join(HTML_ROOT, '/video');

function convertDateString(dateStr : string) : string {
	// YYYYMMDD -> DD/MM/YYYY
	return dateStr.substring(6, 8) + '/' + dateStr.substring(4, 6) + '/' + dateStr.substring(0, 4);
}

class Files {
	files : string[];

	constructor() {
		this.files = [];
	}
}

class DateContent {
    [ key : string ] : Files;
}

function getMediaFiles(mediaRoot : string, prefix : string) : DateContent {
	let dates : DateContent = new DateContent();

	fs.readdirSync(mediaRoot)
		.filter(file => file.match(new RegExp('^' + prefix + '-.*')))
		.forEach(file => {
			let curDate : string = convertDateString(file.split('-')[1]);
			if (!dates[curDate]) {
				dates[curDate] = new Files();
			}
			dates[curDate].files.push(file);
		});

	console.log('Loaded files from ' + mediaRoot + ' for ' + Object.keys(dates).length + ' dates');
	return dates;
}

let myImages : DateContent = getMediaFiles(IMG_MINE_ROOT, 'IMG');
let otherImages : DateContent = getMediaFiles(IMG_OTHER_ROOT, 'IMG');

let myVideos : DateContent = getMediaFiles(VID_MINE_ROOT, 'VID');
let otherVideos : DateContent = getMediaFiles(VID_OTHER_ROOT, 'VID');

console.log('Loaded properties of ' + Object.keys(chatProps).length + ' chats');

// converts internal date to a sortable format
function convertDate(date : DateObj) : string {
	// { 'date': 'DD/MM/YYYY', 'time': 'H:MM AM' } => 'YYYY-MM-DD mmmm'
	if (date.date !== undefined && date.time !== undefined) {
		let t : string[] = date.time.replace(' ', ':').split(':');
		let minutes : number = parseInt(t[0]) * 60 + parseInt(t[1]) + (t[2] == 'PM' ? 720 : 0);
		return date.date.replace(/(..)\/(..)\/(....)/, '$3-$2-$1 ') + (minutes < 1000 ? '0' : '') + minutes;
	}
	else {
		return '0000-00-00 0000';
	}
}

function getSortedChatList() : FileObj[] {
	let files : FileObj[] = getChatList(DATA_ROOT);
	
	files.forEach(chat => { chat.props = chatProps[chat.name]; });

	// sort chat list by last date
	files.sort((a, b) => {
		if (a.props === undefined || !a.props.date) {
			return 1;
		}
		else if (b.props === undefined || !b.props.date) {
			return -1;
		}
		else {
			return convertDate(b.props.date).localeCompare(convertDate(a.props.date));
		}
	});

	return files;
}

class Message {
	date? : DateObj;
	person? : string;
	myself? : boolean;
	text : string[];
	constructor() {
		this.text = [];
	}
}

class ChatContents {
	[ key : string ] : Message[];
}

function getChatContents(chatName : string) : ChatContents {
	let lines : string[] = fs.readFileSync(path.join(DATA_ROOT, '/WhatsApp Chat with ' + chatName + '.txt')).toString().split(/(?:\r\n|\r|\n)/g);
	let dates : ChatContents = new ChatContents();
	let i : number = 0;
	while (i < lines.length) {
		let message : Message = new Message();
		// extract date and time from message line
		message.date = parseDate(lines[i].split(' - ')[0]);
		message.text.push(lines[i].replace(/[^-]* - /, ''));
		// extract message sender
		if (message.text[0].includes(':')) {
			message.person = message.text[0].split(':')[0];
			message.myself = (message.person == 'Wolfgang');
			message.text[0] = message.text[0].replace(/[^:]*: /, '');
		}
		let j = i + 1;
		// handle multiline messages
		while (j < lines.length && !lines[j].match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9].*/)) {
			message.text.push(lines[j]);
			j ++;
		}
		if (message.date.date !== undefined) {
			if (!dates[message.date.date]) {
				dates[message.date.date] = [];
			}
			dates[message.date.date].push(message);
	
		}
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
	if (request.query.name !== undefined) {
		let chatName : string = request.query.name as string;

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
	}
	else {
		response.sendStatus(404);
	}

});

console.log('Static content at ' + HTML_ROOT);
app.use('/static', express.static(HTML_ROOT));

app.listen(PORT, () => { console.log('Chat viewer listening on port ' + PORT); });
