import squel from 'squel';
import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
const squelPostgres = squel.useFlavour('postgres');

const seedDataToTherapistDepartmentsTable = async () => {
    const query = squelPostgres
        .select()
        .field(`${TABLE_NAME.THERAPIST}.id as therapist_id`)
        .field(`${TABLE_NAME.THERAPIST}.department_id as department_id`)
        .from(TABLE_NAME.THERAPIST)
        .toParam();
    const result = await BaseModel.runQuery(query);
    await BaseModel.insertBulk(TABLE_NAME.THERAPIST_DEPARTMENTS, result.rows);
};

seedDataToTherapistDepartmentsTable()
    .then(() => console.log('success upadte table'))
    .catch((e) => console.warn(e, 'createS3Game error'));
