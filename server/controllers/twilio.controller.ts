import twilio from 'twilio';
import * as RequestIp from '@supercharge/request-ip';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const sheabaIP = process.env.SHEABA_IP_TO_FILTER;
const client = twilio(accountSid, authToken);

export const getIceServers = (req, res, next) => {
	const ip = RequestIp.getClientIp(req);
	console.log(`incoming ip address is: ${ip}`);
	const onlyTcp = ip.includes(sheabaIP);
	client.tokens
		.create()
		.then((token) => {
			const iceServers = onlyTcp ? token.iceServers.filter(iceServer => iceServer['url'].includes('transport=tcp')) : token.iceServers;
			res.json({ iceServers, onlyTcp });
		})
		.catch((err) => next(err));
};
