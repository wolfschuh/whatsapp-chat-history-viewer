// contains common functions for the chat viewer

import * as fs from "fs";

export class DateObj {
	date? : string;
	time? : string;
};

export function parseDate(dateString : string) : DateObj {
	let date : DateObj = { date : dateString.substring(0, 10), time : undefined };

	let hour : string = dateString.replace(/.*, /, '').replace(/:.*/, '');
	let minute : string  = dateString.replace(/.*:/, '').replace(/ .*/, '');
	date.time = hour + ':' + minute + ' ';
	if (dateString.includes('in the afternoon') || dateString.includes('in the evening') || (dateString.includes('in the night') && parseInt(hour) > 8)) {
		date.time += 'PM';
	} else {
		date.time += 'AM';
	}

	return date;
}

export class MessageProps {
    date? : DateObj;
    text? : string;
};

export class FileObj {
	id : number;
	name : string;
	file : string;
	props? : MessageProps;

	constructor(id : number, name : string, file : string) {
		this.id = id;
		this.name = name;
		this.file = file;
	}
}

export function getChatList(directory : string) : FileObj[] {
	let files : FileObj[] = [];
	let i = 0;

	fs.readdirSync(directory)
		.filter(file => file.match(/WhatsApp Chat with .*.txt/))
		.forEach(file => {
			files.push(new FileObj((i ++), file.replace(/^WhatsApp Chat with /, '').replace(/.txt$/, ''), file));
		});

	return files;
}

export class ChatProps {
    [ key : string ] : MessageProps;
};