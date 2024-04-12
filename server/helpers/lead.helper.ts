import { isNil, map } from 'lodash';

import * as BaseModel from '../services/BaseModel.service';
import * as LeadModel from '../models/lead.model';
import * as EncryptHelper from '../services/encrypt.helper';
import * as Helper from '../services/util.helper';
import * as ActivityLog from '../helpers/activity-log.helper';

export const getAll = async (): Promise<LeadModel.ILead[]> => {
	try {
		const encryptedLeads = await LeadModel.getAll();
		return map(encryptedLeads, (lead) => {
			const decrypted = EncryptHelper.decryptJson(lead);
			return {
				...decrypted,
				reminder: decrypted.reminder?.[0] || '',
				reminder_created_at: decrypted.reminder_created_at?.[0] || '',
			};
		});
	} catch (error) {
		console.error('failed to get all leads', error);
	}
};

export const createLead = async (lead: LeadModel.ILead): Promise<LeadModel.ILead> => {
	const createLeadFunc = async (client = null) => {
		if (lead.email && !Helper.validateEmail(lead.email)) {
			throw new Error('email not valid');
		}
		const encryptedLead = EncryptHelper.encryptJson(lead);
		const { contact_full_name, contact_phone, contact_email, ...rest } = encryptedLead;
		try {
			const createdLead = await LeadModel.createLead(rest, client);
			if (contact_phone || contact_email) {
				await LeadModel.createContact(createdLead.id, contact_full_name, contact_phone, contact_email, client);
			}
			return EncryptHelper.decryptJson(createdLead);
		} catch (error) {
			console.error('failed to create a lead', error);
		}
	};
	return BaseModel.runAsTransaction(createLeadFunc);
};

export const editLead = async (lead: LeadModel.ILead): Promise<LeadModel.ILead> => {
	const { id, ...leadWithoutId } = lead;
	if (lead.email && !Helper.validateEmail(leadWithoutId.email)) {
		throw new Error('email not valid');
	}

	const editLeadFunc = async (client = null) => {
		try {
			const encryptedLead = EncryptHelper.encryptJson(leadWithoutId);
			const { contact_email, contact_full_name, contact_phone, ...rest } = encryptedLead;
			const updatedLead = await LeadModel.editLead(id, rest, client);
			const updatedContact = await LeadModel.editLeadContact(
				updatedLead.id,
				contact_email,
				contact_full_name,
				contact_phone,
				client
			);
			if (isNil(updatedContact)) {
				await LeadModel.createContact(updatedLead.id, contact_full_name, contact_phone, contact_email, client);
			}
			return EncryptHelper.decryptJson(updatedLead);
		} catch (error) {
			console.error('failed to update lead', error);
		}
	};
	return BaseModel.runAsTransaction(editLeadFunc);
};

export const getReminders = async (leadId: number): Promise<LeadModel.IReminder[]> => {
	const allReminders = await LeadModel.getReminders(leadId);
	return map(allReminders, (reminder) => {
		const { first_name, last_name, ...rest } = EncryptHelper.decryptJson(reminder);
		return { ...rest, admin_first_name: first_name, admin_last_name: last_name };
	});
};

export const createReminder = async (
	lead_id: number,
	reminder: string,
	userId: number
): Promise<LeadModel.IReminder[] | []> => {
	if (!lead_id) {
		return [];
	}
	try {
		if (!reminder) {
			return await getReminders(lead_id);
		}
		await LeadModel.createLeadReminder({ reminder, lead_id, performed_by_user_id: userId });
		return await getReminders(lead_id);
	} catch (error) {
		console.error('failed to create a reminder');
	}
};

export const linkLeadToPatient = async (leadId: number, patientId: number, patientUserId: number) => {
	const linkLeadFunc = async (client = null) => {
		await LeadModel.linkLeadToPatient(leadId, patientId, client);
		const allLeadReminders = await getReminders(leadId);
		return ActivityLog.createLogsFromReminders(allLeadReminders, patientUserId, client);
	};
	return BaseModel.runAsTransaction(linkLeadFunc);
};
