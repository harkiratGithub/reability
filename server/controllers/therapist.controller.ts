import * as TherapistHelper from '../helpers/therapist.helper';

export const extractBodyParams = (body) => {
	const {
		first_name: firstName,
		last_name: lastName,
		identity_number: identityNumber,
		phone,
		email,
		departments_ids: departmentsIds,
		expertises_ids: expertisesIds,
		therapist_type: therapistType,
	} = body;
	const therapistData = {
		firstName,
		lastName,
		email,
		departmentsIds,
		expertisesIds,
		therapistType,
	};
	const userData = {
		email,
	};
	return { therapistData, userData };
};

export const createTherapist = (req, res, next) => {
	const { therapistData } = extractBodyParams(req.body.therapist);

	TherapistHelper.createTherapist(therapistData)
		.then((createdTherapist) => res.json(createdTherapist))
		.catch((err) => next(err));
};

export const editTherapist = (req, res, next) => {
	const { therapistData, userData } = extractBodyParams(req.body.therapist);
	const { therapistId } = req.body;

	TherapistHelper.editTherapist({ ...therapistData, id: therapistId }, userData)
		.then((editedTherapist) => res.json(editedTherapist))
		.catch((err) => next(err));
};

export const deleteTherapist = (req, res, next) => {
	const { id } = req.params;

	TherapistHelper.deleteTherapist(id)
		.then(() => res.json({ id }))
		.catch((err) => next(err));
};

export const getAllActive = (req, res, next) => {
	TherapistHelper.getAllActive()
		.then((activeTherapists) => res.json(activeTherapists))
		.catch((err) => next(err));
};

export const getTherapistsSessions = (req, res, next) => {
	TherapistHelper.getTherapistsSessions()
		.then((sessions) => res.json(sessions))
		.catch((err) => next(err));
};
