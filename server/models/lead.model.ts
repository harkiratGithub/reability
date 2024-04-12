import squel from 'squel';

import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';

export interface ILead {
	id?: number;
	patient_id?: number;
	first_name?: string;
	last_name?: string;
	phone?: string | number;
	email?: string;
	referral?: string;
	reminder?: string[];
	contact_full_name?: string;
	contact_phone?: string | number;
	contact_email?: string | number;
}

export interface IReminder {
	id?: number;
	performed_by_user_id?: number;
	lead_id?: number;
	reminder?: string;
	admin_first_name?: string;
	admin_last_name?: string;
	created_at?: any;
}

const squelPostgres = squel.useFlavour('postgres');

export const getAll = async (): Promise<ILead[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.LEAD}.id`)
		.field(`${TABLE_NAME.LEAD}.first_name`)
		.field(`${TABLE_NAME.LEAD}.last_name`)
		.field(`${TABLE_NAME.LEAD}.phone`)
		.field(`${TABLE_NAME.LEAD}.email`)
		.field(`${TABLE_NAME.LEAD}.active`)
		.field(`${TABLE_NAME.LEAD}.referral`)
		.field(`${TABLE_NAME.LEAD}.created_at`)
		.field(`${TABLE_NAME.LEAD_CONTACTS}.full_name`, 'contact_full_name')
		.field(`${TABLE_NAME.LEAD_CONTACTS}.phone`, 'contact_phone')
		.field(`${TABLE_NAME.LEAD_CONTACTS}.email`, 'contact_email')
		.field(
			`ARRAY_AGG(${TABLE_NAME.LEAD_REMINDER}.reminder ORDER BY ${TABLE_NAME.LEAD_REMINDER}.created_at DESC)`,
			'reminder'
		)
		.field(
			`ARRAY_AGG(${TABLE_NAME.LEAD_REMINDER}.created_at ORDER BY ${TABLE_NAME.LEAD_REMINDER}.created_at DESC)`,
			'reminder_created_at'
		)
		.from(TABLE_NAME.LEAD)
		.left_join(TABLE_NAME.LEAD_REMINDER, null, `${TABLE_NAME.LEAD_REMINDER}.lead_id = ${TABLE_NAME.LEAD}.id`)
		.left_join(TABLE_NAME.LEAD_CONTACTS, null, `${TABLE_NAME.LEAD_CONTACTS}.lead_id = ${TABLE_NAME.LEAD}.id`)
		.group(`${TABLE_NAME.LEAD}.id`)
		.group(`${TABLE_NAME.LEAD_CONTACTS}.full_name`)
		.group(`${TABLE_NAME.LEAD_CONTACTS}.phone`)
		.group(`${TABLE_NAME.LEAD_CONTACTS}.email`)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const getReminders = async (leadId: number): Promise<[]> => {
	const query = squelPostgres
		.select()
		.field(`${TABLE_NAME.LEAD_REMINDER}.id`)
		.field(`${TABLE_NAME.LEAD_REMINDER}.performed_by_user_id`)
		.field(`${TABLE_NAME.LEAD_REMINDER}.lead_id`)
		.field(`${TABLE_NAME.LEAD_REMINDER}.reminder`)
		.field(`${TABLE_NAME.LEAD_REMINDER}.created_at`)
		.field(`${TABLE_NAME.ADMIN}.first_name`)
		.field(`${TABLE_NAME.ADMIN}.last_name`)
		.from(TABLE_NAME.LEAD_REMINDER)
		.join(TABLE_NAME.ADMIN, null, `${TABLE_NAME.LEAD_REMINDER}.performed_by_user_id = ${TABLE_NAME.ADMIN}.user_id`)
		.where(`${TABLE_NAME.LEAD_REMINDER}.lead_id = ?`, leadId)
		.order(`${TABLE_NAME.LEAD_REMINDER}.created_at`, false)
		.toParam();
	const result = await BaseModel.runQuery(query);
	return result.rows;
};

export const createLead = (leadToCreate: ILead, client = null): Promise<ILead> =>
	BaseModel.insertRow(TABLE_NAME.LEAD, leadToCreate, client);

export const createLeadReminder = (reminderToCreate: IReminder, client = null): Promise<ILead[]> =>
	BaseModel.insertRow(TABLE_NAME.LEAD_REMINDER, reminderToCreate, client);

export const editLead = (leadId: number, leadToUpdate: ILead, client = null): Promise<ILead> =>
	BaseModel.updateRowByField(TABLE_NAME.LEAD, leadToUpdate, 'id', leadId, client);

export const linkLeadToPatient = (leadId: number, patient_id: number, client = null): Promise<any> =>
	BaseModel.updateRowByField(TABLE_NAME.LEAD, { patient_id, active: false }, 'id', leadId, client);

export const createContact = (lead_id: number, full_name: string, phone: string, email: string, client = null) =>
	BaseModel.insertRow(TABLE_NAME.LEAD_CONTACTS, { lead_id, full_name, phone, email }, client);

export const editLeadContact = (leadId: number, email: string, full_name: string, phone: string, client = null) =>
	BaseModel.updateRowByField(TABLE_NAME.LEAD_CONTACTS, { email, full_name, phone }, 'lead_id', leadId, client);
