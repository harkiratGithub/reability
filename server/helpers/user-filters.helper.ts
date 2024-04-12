import * as UserFiltersModel from '../models/user-filters.model';

export const getUserFilters = (userId: number): Promise<UserFiltersModel.IUserFilters> => {
	return UserFiltersModel.getUserFilters(userId);
};

export const setUserFilter = (userId: number, filterName: string, value: any): Promise<any> => {
	return UserFiltersModel.setFilter(userId, filterName, value);
};
