import { Moment } from 'moment';
import * as scheduler from 'node-schedule'
import moment from 'moment'

export const setSchedulerByDate = (date:Date = new Date(), operation = () => {}) => {
    var j = scheduler.scheduleJob(date, operation);
}

export const setScheduler = (seconds = '*', minute = '*', hour = '*', dayOfMonth = '*', month = '*', dayOfWeek = '*', operation = () => {}) => {
    const date = `${seconds} ${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`
    //console.log('date ?', date);
    var j = scheduler.scheduleJob(date, operation)

}

export const setSchedulerByMoment = (date: Moment = moment(), operation = () => {}) => {
    const year = date.get('year');
    const month = (date.get('month') + 1).toString();  // 0 to 11 but should send 1 - 12
    const day = date.get('date').toString();
    const hour = date.get('hour').toString();
    const minute = date.get('minute').toString();
    const second = date.get('second').toString();
    
    var j = setScheduler(second, minute, hour, day, month, "*", operation);
}

export const setRecurrenceScheduler = (rule = new scheduler.RecurrenceRule(), operation = () => {}) => {
    //var rule = new scheduler.RecurrenceRule();
    //rule.dayOfWeek = [0, new schedule.Range(4, 6)];
    //rule.hour = 17;
    //rule.minute = 0;

    // RecurrenceRule properties
    // second (0-59)
    // minute (0-59)
    // hour (0-23)
    // date (1-31)
    // month (0-11)
    // year
    // dayOfWeek (0-6) Starting with Sunday
    
    var j = scheduler.scheduleJob(rule, operation);
}