import squel from 'squel';
import * as BaseModel from '../services/BaseModel.service';
import { TABLE_NAME } from '../const';
import { map } from 'lodash';

const setSllPatientsDisabledSkeleton = async () => {
    const allPatients = await BaseModel.getAllTable(TABLE_NAME.PATIENT);

    map(allPatients, (patient) => {
        patient.disabled_skeleton = true;
        BaseModel.updateRowByField(TABLE_NAME.PATIENT, patient, 'id', patient.id);
    });

};

setSllPatientsDisabledSkeleton()
    .then(() => console.log('success upadte table'))
    .catch((e) => console.warn(e, 'setSllPatientsDisabledSkeleton error'));