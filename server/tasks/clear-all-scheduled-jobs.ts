const schedule = require('node-schedule');

export const clearAllTasks = () => {
    console.log(`All Jobs: ${schedule.scheduledJobs}`);
    for (const job in schedule.scheduledJobs) schedule.cancelJob(job);
    console.log(`All Jobs Deleted: ${schedule.scheduledJobs}`);
};