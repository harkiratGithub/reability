import { sendEmail } from '../email/send';

const baseUrl = () => {
	return process.env.SERVER_URL + '/#';
};

export const sendNewUserEmail = async (userEmail, token) => {
	await sendEmail(userEmail, 'change-password', {
		tokenUrl: `${baseUrl()}/email_auth/${token}`,
	});
};

export const sendNewPasswordEmail = async (userEmail, userName, password) => {
	await sendEmail(userEmail, 'updated-credentials', {
		username: userName,
		password,
		loginUrl: baseUrl(),
	});
};

export const sendUpdatedUserEmail = async (userEmail, userName, password) => {
	await sendEmail(userEmail, 'updated-credentials', {
		username: userName,
		password,
		loginUrl: baseUrl(),
	});
};

// sendFastLoginEmail — deleted (no longer used)

export const sendPatientCredentialsEmail = async (userEmail: string, userName: string, password: string, instituteName?: string) => {
	await sendEmail(userEmail, 'welcome',
		{ userName, password, loginUrl: baseUrl() },
		{ instituteName }
	);
};

// export const sendUserConnectedEmail = async (patient, therapist) => {
// 	// TODO: migrate to Resend if needed
// };

export const sendQrReVerify2FA = async (userEmail, qrLink) => {
	await sendEmail(userEmail, 'QR', {
		qr_code: `<img src="${qrLink}" alt="QR Code" style="max-width:200px;" />`,
	});
};

// export const sendUserLoggedInEmail = async (patient) => {
// 	// TODO: migrate to Resend if needed
// };
