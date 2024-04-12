import { TABLE_NAME } from '../const';
import * as BaseModel from '../services/BaseModel.service';

export const addImage = (key, url, client = null) => {
	return BaseModel.insertRow(TABLE_NAME.IMAGE, { key, url }, client);
};

export const deleteImage = (id, client = null) => {
	return BaseModel.deleteRowById(TABLE_NAME.IMAGE, id, client);
};
