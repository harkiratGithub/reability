// Single environment variable:
//   RESEND_API_KEY  - Resend API key
//
// All other email fields (from, reply-to, subject, cc, bcc, body) are stored in the template file.
// The "to" address and template name come from the caller.
// Placeholders in the template body (e.g. {{username}}, {{password}}, {{qr_code}})
// are replaced at runtime with the values passed in the placeholders object.
//
// Template path: server/email/templates/<templateName>.html

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_Sgg6KkJv_BzurFtiE2qGuotGQRWBP9iL4';

let resend: Resend;
function getResend(): Resend {
	if (!resend) resend = new Resend(RESEND_API_KEY);
	return resend;
}

function getMeta(html: string, name: string): string {
	const match = html.match(new RegExp(`<meta name="${name}" content="([^"]+)"`));
	if (!match) throw new Error(`Missing meta tag: ${name}`);
	return match[1];
}

function getMetaOptional(html: string, name: string): string | undefined {
	const match = html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`));
	return match?.[1] || undefined;
}

function resolveTemplatePath(templateName: string, instituteName?: string): string {
	if (instituteName) {
		const slug = instituteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		const institutePath = path.join(__dirname, 'templates', slug, `${templateName}.html`);
		if (fs.existsSync(institutePath)) return institutePath;
	}
	const defaultPath = path.join(__dirname, 'templates', `${templateName}.html`);
	if (fs.existsSync(defaultPath)) return defaultPath;
	throw new Error(`Template not found: ${templateName}`);
}

export async function sendEmail(
	userEmail: string,
	templateName: string,
	placeholders: Record<string, string> = {},
	options?: {
		instituteName?: string;
		attachments?: Array<{ filename: string; content: string; contentType: string }>;
	}
) {
	const templatePath = resolveTemplatePath(templateName, options?.instituteName);
	const template = fs.readFileSync(templatePath, 'utf-8');

	const subject = getMeta(template, 'email-subject');
	const from = getMeta(template, 'email-from');
	const replyTo = getMeta(template, 'email-reply-to').split(',').map((s) => s.trim());
	const cc = getMetaOptional(template, 'email-cc')?.split(',').map((s) => s.trim());
	const bcc = getMetaOptional(template, 'email-bcc')?.split(',').map((s) => s.trim());

	const html = Object.entries(placeholders).reduce(
		(body, [key, value]) => body.replace(new RegExp(`{{${key}}}`, 'g'), value),
		template
	);

	const { data, error } = await getResend().emails.send({
		from,
		to: [userEmail],
		replyTo,
		...(cc && { cc }),
		...(bcc && { bcc }),
		subject,
		html,
		...(options?.attachments && {
			attachments: options.attachments.map((a) => ({
				filename: a.filename,
				content: a.content,
				contentType: a.contentType,
			})),
		}),
	});

	if (error) throw new Error(`Failed to send email: ${error.message}`);
	return data;
}
