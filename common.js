// contains common functions for the chat viewer

const fs = require('fs');

exports.parseDate = function(dateString) {
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

exports.getChatList = function(directory) {
	let files = [];
	let i = 0;

	fs.readdirSync(directory)
		.filter(file => file.match(/WhatsApp Chat with .*.txt/))
		.forEach(file => {
			files.push({ 'id' : (i ++), 'name': file.replace(/^WhatsApp Chat with /, '').replace(/.txt$/, ''), 'file': file });
		});

	return files;
}
