import { env } from "process";

export const handleLogs = (req, res, next) => {
    if (req.headers["x-xsrf-token"] && req.headers["x-xsrf-token"] === env.LOGGER_TOKEN) {
        console.error(req.body);
    } else {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};