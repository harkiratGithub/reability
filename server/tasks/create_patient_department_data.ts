import squel from 'squel';
import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
const squelPostgres = squel.useFlavour('postgres');

const seedDataToParientDepartmentsTable = async () => {
    const query = squelPostgres
        .select()
        .field(`${TABLE_NAME.PATIENT}.id as patient_id`)
        .field(`${TABLE_NAME.PATIENT}.department_id as department_id`)
        .from(TABLE_NAME.PATIENT)
        .toParam();
    const result = await BaseModel.runQuery(query);
    await BaseModel.insertBulk(TABLE_NAME.PATIENT_DEPARTMENTS, result.rows);
};

seedDataToParientDepartmentsTable()
    .then(() => console.log('success upadte table'))
    .catch((e) => console.warn(e, 'createS3Game error'));

