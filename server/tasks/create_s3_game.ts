// create games in s3:
// 1) create bucket in s3
// 2) make the bucket with public access
// 3) make the bucket "Static website hosting" in properties
// (fill the index document field with: index.html)
// 4) upload the game build to s3.
// make sure there's index.html (the platform run index.html as the root of the game), enable.png, disable.png
// 5) make all the files public.
// 6) run the script in createS3Game.js(it add the game to our DB, and add to all the patients this game).
// change the name, and the bucket name. run this file: node createS3Game.js
import dotenv from 'dotenv';
import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import { map } from 'lodash';
dotenv.config();

const createS3Game = async () => {
	const newUrl = `https://${process.env.SCRIPT_BUCKET_NAME}.s3.eu-central-1.amazonaws.com/`;
	const game = await BaseModel.insertRow(TABLE_NAME.GAME, {
		name: process.env.SCRIPT_GAME_NAME,
		url: newUrl,
		description: process.env.SCRIPT_BUCKET_DESCRIPTION,
	});
	const allPatients = await BaseModel.getAllTable(TABLE_NAME.PATIENT);
	const patientWithGames = map(allPatients, (patient) => {
		return {
			patient_id: patient.id,
			game_id: game.id,
			active: true,
		};
	});
	await BaseModel.insertBulk(TABLE_NAME.PATIENT_GAME, patientWithGames);
};

createS3Game()
	.then(() => console.log('success add game to s3'))
	.catch((e) => console.warn(e, 'createS3Game error'));
