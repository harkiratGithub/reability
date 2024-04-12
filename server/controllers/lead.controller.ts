import { Request, Response, NextFunction } from 'express';

import * as LeadHelper from '../helpers/lead.helper';
import * as Helper from '../services/util.helper';
import { ILead } from '../models/lead.model';

export const createLeadAndReminder = (req, res, next) => {
	const userId = req.user.id;
	const { reminder, ...lead } = req.body;
	LeadHelper.createLead(lead)
		.then(async (createdLead) => {
			if (reminder) {
				await LeadHelper.createReminder(createdLead?.id, reminder, userId);
			}
			res.json(createdLead);
		})
		.catch((err) => next(err));
};
export const editLead = (req, res, next) => {
	const lead = req.body;
	LeadHelper.editLead(lead)
		.then((updatedLead) => res.json(updatedLead))
		.catch((err) => next(err));
};

export const getAll = (req, res, next) => {
	LeadHelper.getAll()
		.then((result) => {
			res.json(result);
		})
		.catch((err) => next(err));
};

export const getRemindersById = (req, res, next) => {
	const { leadId: lead_id } = req.params;
	LeadHelper.getReminders(lead_id)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};
export const createReminder = (req, res, next) => {
	const userId = req.user.id;
	const { lead_id, reminder } = req.body;
	LeadHelper.createReminder(lead_id, reminder, userId)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};

export const createLeadFromAPI = (req: Request, res: Response, next: NextFunction) => {
	const { firstName, lastName, email, phone, referral } = req.body;
	if (!isLeadFromApiValid(firstName, lastName, email, phone, referral)) {
		res.status(400).send('Invalid Parameters');
		return;
	}

	const lead: ILead = { first_name: firstName, last_name: lastName, email, phone, referral: referral || 'API' };
	LeadHelper.createLead(lead)
		.then(() => {
			res.status(200).send({ status: 'OK' });
		})
		.catch(() => res.sendStatus(500));
};

const isLeadFromApiValid = (firstName: string, lastName: string, email: string, phone: string, referral) => {
	return (
		firstName &&
		firstName.length >= 1 &&
		firstName.length <= 255 &&
		lastName &&
		lastName.length >= 1 &&
		lastName.length <= 255 &&
		(!email || email.length === 0 || (email.length <= 255 && Helper.validateEmail(email))) &&
		phone &&
		phone.length >= 1 &&
		phone.length <= 255 &&
		(!referral || referral.length === 0 || referral.length <= 255)
	);
};
