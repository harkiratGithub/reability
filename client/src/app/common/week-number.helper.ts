/**
 * git@bitbucket.org:spectory/weeknumber.git
 *
 * Returns the year and week number of a given date
 * Week numbers start at 1 on the first Sunday of the year
 *
 * @param {number} year
 *   The full year (2021, 2022, ...)
 * @param {number} month
 *   A month (Jan=1, Feb=2, ...)
 * @param {number} day
 *   The day of the month (1-31)
 *
 * @return
 *   JSON containing the year and week number
 */
export const weekNumberFromDate = (year, month, day) => {
	const d = new Date(year, month - 1, day);

	// set the date to this week's Sunday
	d.setDate(d.getDate() - d.getDay());

	let weekNumber = 0;
	const y = d.getFullYear();
	// as long as we're still on the same year as the
	// this week's Sunday, subtract a week, count it
	// and loop till we reach the year before
	while (d.getFullYear() === y) {
		d.setDate(d.getDate() - 7);
		weekNumber += 1;
	}
	return {
		year: y,
		weekNumber,
	};
};
