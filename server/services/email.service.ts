import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendMail = async (to, subject, html, cc?, attachments?) => {
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
		attachments,
	};
	if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
		console.error(msg);
		await sgMail.send(msg);
	} else {
		await sgMail.send(msg);
	}
};

export { sgMail };
