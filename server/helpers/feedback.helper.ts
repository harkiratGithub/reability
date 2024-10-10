import dbService from '../services/db.service';

export const getFeedbackQuestions = async () => {
	const db = dbService.getDataBase();
	const query = `
		SELECT * FROM feedback_questions;
	`;
	
	try {
		const result = await db.query(query);
		return result.rows;
	} catch (error) {
		throw new Error(`Error fetching feedback questions: ${error.message}`);
	}
};
