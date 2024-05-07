import sgMail from '@sendgrid/mail';

export const sendMail = async (to, subject, html, cc?) => {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
	const emailFrom = process.env.SENGRID_FROM_EMAIL ? process.env.SENGRID_FROM_EMAIL : 'yoramfeld@gmail.com';
	const msg = {
		to,
		cc,
		from: {
			email: emailFrom,
			name: 'ReAbility',
		},
		subject,
		html,
	};
	if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
		console.error(msg);
		await sgMail.send(msg);
	} else {
		await sgMail.send(msg);
	}
};
