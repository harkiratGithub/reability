import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
const client = twilio(accountSid, authToken);

//TODO - need to test on real SMS
export const sendSms = (text, phoneTo) => {

	const msg = {
		from: twilioFromNumber,
		to: `+972${phoneTo}`,
		body: text,
	};
	client.messages.create(msg).then(messageSent => {
		console.log(`message Sent result:'${JSON.stringify(messageSent)}'`)
	}).catch(function (err) {
		console.error('Error sending sms to ' + `+972${phoneTo}`);
		console.error(err);
	});
};
