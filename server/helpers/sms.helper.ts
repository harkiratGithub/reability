import { text } from 'express';
import * as SMSHelper from '../services/sms.service';
const TinyURL = require('tinyurl');
const baseUrl = () => {
	return process.env.SERVER_URL + '/#';
};

export const sendFastLoginSMS = async (userPhone, fastLoginToken) => {
	const tokenUrl = `${baseUrl()}/fast_login/${fastLoginToken}`;

	TinyURL.shorten(tokenUrl).then(async function (res) {
		const text = `Welcome to ReAbility system. Please click here: ${res} to login`;

		await SMSHelper.sendSms(text, userPhone);
	}, function (err) {
		console.log(err)
	})
};
