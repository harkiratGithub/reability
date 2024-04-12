import { Response, Request, NextFunction } from 'express';

import * as FollowupHelper from '../helpers/followup.helper';
import { IFollowup } from '../models/followup.model';

export const getAll = (req: Request, res: Response, next: NextFunction): Promise<void> => {
	return FollowupHelper.getAll()
		.then((followups: IFollowup[]) => {
			res.json(followups);
		})
		.catch((err) => next(err));
};

export const editFollowup = (req, res, next) => {
	const { followup } = req.body;
	FollowupHelper.editFollowup(followup)
		.then((editedPatient) => res.json(editedPatient))
		.catch((err) => next(err));
};

export const deleteFollowup = (req, res, next) => {
	const { id } = req?.params;
	const user = req.user;

	FollowupHelper.deleteFollowup(id, user.id)
		.then((deletedFollowup) => res.json(deletedFollowup))
		.catch((err) => next(err));
};

export const createFollowup = (req, res, next) => {
	const { followup } = req.body;
	FollowupHelper.createFollowup(followup)
		.then((createdDepartment) => res.json(createdDepartment))
		.catch((err) => next(err));
};
