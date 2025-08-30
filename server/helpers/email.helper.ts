import * as EmailHelper from '../services/email.service';

const baseUrl = () => {
	return process.env.SERVER_URL + '/#';
};

const therapistEmail = process.env.THERAPIST_EMAIL;
const bccEmail = process.env.BCC_EMAIL;
export const sendNewUserEmail = async (userEmail, token) => {
	const tokenUrl = `${baseUrl()}/email_auth/${token}`;
	const subject = 'ReAbility';
	const html = `<div>Welcome to ReAbility system. Please <a href="${tokenUrl}">click here</a> to set your password</div>`;
	await EmailHelper.sendMail(userEmail, subject, html);
};

export const sendNewPasswordEmail = async (userEmail, userName, password) => {
	const url = `${baseUrl()}`;
	const subject = 'ReAbility';
	const html = `<div>This are your login details:<br>Username: ${userName}<br>Password: ${password}<br> Please <a href="${url}">click here</a> to login</div>`;
	await EmailHelper.sendMail(userEmail, subject, html);
};

export const sendUpdatedUserEmail = async (userEmail, userName, password) => {
	const url = `${baseUrl()}`;
	const subject = 'ReAbility New User';
	const html = `<div>Please make a note of:<br>Username: ${userName}<br>Password: ${password}<br>Website:  <a href="${url}">${url}</a></div>`;
	await EmailHelper.sendMail(userEmail, subject, html);
};

export const sendFastLoginEmail = async (userEmail, fastLoginToken) => {
	const tokenUrl = `${baseUrl()}/fast_login/${fastLoginToken}`;
	const subject = 'ReAbility';
	const html = `<div>Welcome to ReAbility system. Please <a href="${tokenUrl}">click here</a> to login</div>`;
	await EmailHelper.sendMail(userEmail, subject, html);
};
export const sendPatientCredentialsEmail = async (userEmail, userName, password) => {
	const url = `${baseUrl()}`;
	const domain = new URL(url).hostname; 
	let subject;
	let html;
	if (process.env.EMAIL_LANGUAGE === 'english') {
		subject = 'Welcome to ReAbility Online';		
		html = `<div style="direction:ltr; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333;">
		<p>Hello,</p>
		<p>We’re excited to have you on board and look forward to supporting you/your child on a journey towards better health.</p>
		<p>To ensure you all get the most out of the sessions, we kindly ask that the camera & microphone features are enabled when you log in. This is essential for two key reasons:</p>
		<ol style="margin-left: 20px;">
		<li>A licensed therapist will be interacting with you through the platform, face to face.</li>
		<li>Many of the engaging, exercise-based games use skeletal tracking technology, which operates through the webcam to monitor your movements and provide feedback.</li>		
		</ol>
		<p>Rest assured, nothing from your video images are being recorded.</p>		
		<p>Please connect to our platform using this link:</p>
		<p style="font-weight: bold;">
		<a href="${url}" style="color: #007BFF; text-decoration: none;">${process.env.SERVER_URL}</a>
		</p>
		<p><strong>Username:</strong> ${userName}<br><strong>Password:</strong> ${password}</p>
		<p>Your therapist will join the session once available or at the scheduled appointment time.</p>
		<p><strong>Note: On your first login, the browser will ask your permission to use the microphone and camera. Please confirm. The browser will also ask you to confirm saving the username and password. Please confirm.</strong></p>
		<p>We also suggest adding the site to the bookmarks and/or the Desktop for easy access.</p>
		<p>If you have any questions or concerns, don’t hesitate to reach out to us—we’re here to help!</p>
		<p>Best regards,</p>
		<p style="font-weight: bold;">The Reability Online team<br></p>
		</div>`;		
	} else {
		subject = 'Welcome to ReAbility';
		html = `<div style="direction:rtl">ברכות להצטרפותך לשיקום מרחוק, שיבא ביונד.<br><br>להלן ההנחיות להתחברות:<br><br> מחשב עם מצלמת אינטרנט, מיקרופון (לרוב אינטגרלי במצלמה) רמקולים,  <span style="font-weight:bold; ">דרישות טכניות:</span>דפדפן Chrome. יש לעדכן אותנו בהקדם אם אין ברשותך הציוד המתאים .<br><br><div>
		- יש לוודא שהמצלמה והרמקולים מחוברים למחשב (בתכנית קול יש להשתמש באזניות שקיבלת מאיתנו)<br>-  להיכנס לקישור:<a href="${url}">${process.env.SERVER_URL}</a><br>-  להקליד שם משתמש וסיסמא:</div><br>
		<div style="font-weight:bold;font-size:20px; ">שם משתמש: ${userName}<br>סיסמה: ${password}</div><br><div></div>-  לאשר להשתמש במיקרופון ומצלמה<br>-  להמתין שנחייג אליך דרך המחשב <br><br>
		<div style="font-weight:bold;">*לכניסה מהירה מומלץ לאשר לשמור את שם המשתמש והסיסמא וכמו כן לשמור את הלינק לאתר שלנו ב"סרגל הסימניות" של כרום או באמצעות קישור על שולחן העבודה</div>
		<br><div style="font-weight:bold;"><div style="text-decoration:underline; margin-top:10px;">נא להכין תעודת זהות להצגה בתחילת הטיפול</div><br>בהצלחה,<br><br>שיקום מרחוק, שיבא ביונד<br>03-5309661</div></div>`;
	}
	await EmailHelper.sendMail(userEmail, subject, html, therapistEmail,null, bccEmail);
};

export const sendUserConnectedEmail = async (patient, therapist) => {
	const subject = 'Session started notification';
	const html = `<div>Patient ${patient.username} started a session with ${therapist.firstName} ${therapist.lastName} </div>`;
	await EmailHelper.sendMail(patient.notification_email, subject, html);
};

export const sendQrReVerify2FA = async (userEmail, qrLink) => {
	const base64QrImage = qrLink.slice(22);
	let attachments = [
		{
			content: base64QrImage,
			filename: 'QR Code.png',
			type: 'image/png',
			disposition: 'attachment',
		},
	];
	const subject = 'Success Re-Auth';
	const html = `
	<div style="font-family: Arial, sans-serif; text-align: center;">
	  <h2>Success Re-Auth</h2>
	  <p>Welcome to ReAbility system.</p>
	  <p>Re-Scan the attach QR code using your authentication app to verify your identity.</p>
	</div>
	`;
	await EmailHelper.sendMail(userEmail, subject, html, null, attachments);
};

export const sendUserLoggedInEmail = async (patient) => {
	const subject = `${patient.user_name}  patient is online` ;
	const html = `<div>This is an automated message from Success Charity platform. I was instructed to send you this email as soon as patient ${patient.user_name} logs in.
					<br><br>Guess what, it has just happened. <br><br> Success Charity platform</div>`;
	await EmailHelper.sendMail(patient.login_notification_email, subject, html);
};