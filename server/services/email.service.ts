import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendMail = async (to, subject, html, cc?,attachments?: any[], bcc? ) => {	
	let emailFrom: string;
	let nameFrom: string;
	if (process.env.EMAIL_LANGUAGE === 'english') {
		emailFrom ='yoramfeld@gmail.com'; //'newp@therpt.com';
		nameFrom = 'TheRPT';
	} else {
		emailFrom = process.env.SENGRID_FROM_EMAIL ? process.env.SENGRID_FROM_EMAIL : 'yoramfeld@gmail.com';
		nameFrom = 'ReAbility';
	}
	const msg = {
		to,
		cc,
		bcc,
		from: {
			email: emailFrom,
			name: nameFrom,
		},
		subject,
		html,
		attachments: attachments || [],
	};
	if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
		console.error(msg);
		await sgMail.send(msg);
	} else {
		await sgMail.send(msg);
	}
};

export { sgMail };
