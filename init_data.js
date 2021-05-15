// generates additional data for chat list (last message, last time)

const path = require('path');
const fs = require('fs');

const common = require('./common');

const DATA_ROOT = path.join(__dirname, '/data');
const CHAT_PROPERTIES_FILE = path.join(DATA_ROOT, 'chatProps.json');

function decideWhetherTextApplies(text) {
    if (text.length == 0) {
        return false;
    }
    if (text.includes('Your security code')) {
        return false;
    }
    return true;
}

function getLastChatInfo(chatFile) {
	let lines = fs.readFileSync(path.join(DATA_ROOT, chatFile)).toString().split(/(?:\r\n|\r|\n)/g);
    let messageProps = {};
	let i = 0;
	while (i < lines.length) {
		// extract date and time from message line
		let date = common.parseDate(lines[i].split(' - ')[0]);
		let text = lines[i].replace(/[^-]* - /, '');
		// remove message sender
		if (text.includes(':')) {
            text = text.replace(/[^:]*: /, '');
            if (decideWhetherTextApplies(text)) {
                messageProps.date = date;
                messageProps.text = text;
            }
		}
		let j = i + 1;
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
    if (messageProps.text.includes('Media omitted')) {
        messageProps.text = 'Media file';
    }
    if (messageProps.text.length > 50) {
        messageProps.text = messageProps.text.substring(0, 40) + '[...]';
    }
	return messageProps;
}	

let chatProps = {}

common.getChatList(DATA_ROOT).forEach(chat => {
    chatProps[chat.name] = getLastChatInfo(chat.file);
});

fs.writeFileSync(CHAT_PROPERTIES_FILE, JSON.stringify(chatProps, null, 2));