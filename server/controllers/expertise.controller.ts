import * as ExpertiseHelper from '../helpers/expertise.helper';
import * as PatientTreatmentHelper from '../helpers/patient-treatment.helper';
import * as TherapistHelper from '../helpers/therapist.helper';

export const createExpertise = (req, res, next) => {
	const { expertise } = req.body;
	ExpertiseHelper.createExpertise(expertise)
		.then((createdExpertise) => res.json(createdExpertise))
		.catch((err) => next(err));
};

export const editExpertise = (req, res, next) => {
	const { expertise } = req.body;
	ExpertiseHelper.editExpertise(expertise)
		.then((editedExpertise) => res.json(editedExpertise))
		.catch((err) => next(err));
};

export const deleteExpertise = async (req, res, next) => {
	const { id } = req.params;
	let numberOfTreatments = 0;
	let numberOfTherapists = 0;

	const relatedExpertiseData = await Promise.all([
		PatientTreatmentHelper.getNumberOfExpertiseActiveTreatments(id),
		TherapistHelper.getTherapistsByExpertise([id]),
	]);

	numberOfTreatments = relatedExpertiseData[0];
	numberOfTherapists = relatedExpertiseData[1].length;

	const data = { numberOfTreatments, numberOfTherapists };

	if (numberOfTreatments > 0 || numberOfTherapists > 0) {
		res.json(data);
		return;
	}

	ExpertiseHelper.deleteExpertise(id)
		.then(() => res.json(data))
		.catch((err) => next(err));
};

export const getAll = (req, res, next) => {
	ExpertiseHelper.getAll()
		.then((expertises) => res.json(expertises))
		.catch((err) => next(err));
};

export const getAllExpertiseSlots = (req, res, next) => {
	const { expertiseId, week, year, patientId } = req.body;

	if (!expertiseId || !week || !year) {
		return next(`getAllExpertiseSlots: not valid`);
	}
	ExpertiseHelper.getAllExpertiseSlots([expertiseId], week, year, patientId)
		.then((result) => res.json(result))
		.catch((err) => next(err));
};
