import dotenv from 'dotenv';
import seedDatabase from './seedFunction';
import { users, admins } from './seedData';

dotenv.config();

seedDatabase(users, admins)
	.then(() => console.log('seed success!!'))
	.catch((err) => console.warn('error: ', err));
