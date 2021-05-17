// generates additional data for chat list (last message, last time)

import * as path from "path";
import * as fs from "fs";

import { DateObj, MessageProps, ChatProps, parseDate, getChatList } from "./common";

const DATA_ROOT : string = path.join(__dirname, '/data');
const CHAT_PROPERTIES_FILE : string = path.join(DATA_ROOT, 'chatProps.json');

function decideWhetherTextApplies(text : string) : boolean {
    if (text.length == 0) {
        return false;
    }
    if (text.includes('Your security code')) {
        return false;
    }
    return true;
}

function getLastChatInfo(chatFile : string) : MessageProps {
	let lines : string[] = fs.readFileSync(path.join(DATA_ROOT, chatFile)).toString().split(/(?:\r\n|\r|\n)/g);
    let messageProps : MessageProps = new MessageProps();
	let i : number = 0;
	while (i < lines.length) {
		// extract date and time from message line
		let date : DateObj = parseDate(lines[i].split(' - ')[0]);
		let text : string = lines[i].replace(/[^-]* - /, '');
		// remove message sender
		if (text.includes(':')) {
            text = text.replace(/[^:]*: /, '');
            if (decideWhetherTextApplies(text)) {
                messageProps.date = date;
                messageProps.text = text;
            }
		}
		let j : number = i + 1;
		// handle multiline messages
		while (j < lines.length && !lines[j].match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9].*/)) {
            if (decideWhetherTextApplies(lines[j])) {
                messageProps.date = date;
                messageProps.text = lines[j];
            }
			j ++;
		}
		i = j;
	}
    if (messageProps.text !== undefined) {
        if (messageProps.text.includes('Media omitted')) {
            messageProps.text = 'Media file';
        }
        if (messageProps.text.length > 50) {
            messageProps.text = messageProps.text.substring(0, 40) + '[...]';
        }
    }
	return messageProps;
}	

let chatProps : ChatProps = new ChatProps();

getChatList(DATA_ROOT).forEach(chat => {
    chatProps[chat.name] = getLastChatInfo(chat.file);
});

let exportJson : string = JSON.stringify(chatProps, null, 2);
fs.writeFileSync(CHAT_PROPERTIES_FILE, exportJson);
console.log("Wrote " + exportJson.length + " chars to " + CHAT_PROPERTIES_FILE);