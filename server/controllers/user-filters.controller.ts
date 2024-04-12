import * as UserFiltersHelper from '../helpers/user-filters.helper';
import { IUserFilters } from '../models/user-filters.model';

export const getUserFilters = (req, res, next) => {
	const { userId } = req.params;
	UserFiltersHelper.getUserFilters(userId)
		.then((userFilters: IUserFilters) => {
			res.json(userFilters);
		})
		.catch((err) => next(err));
};

export const setUserFilter = (req, res, next) => {
	const user = req.user;
	const { filterName, value } = req.body;
	UserFiltersHelper.setUserFilter(user.id, filterName, value)
		.then((updatedFilter) => {
			res.json(updatedFilter);
		})
		.catch((err) => next(err));
};
