import axios from 'axios';
import * as RequestIp from '@supercharge/request-ip';

const XIRSYS_BASE_URL = 'https://global.xirsys.net/_turn/MyFirstApp';
const XIRSYS_API_USERNAME = process.env.XIRSYS_API_USERNAME; // Your Xirsys API username
const XIRSYS_API_SECRET = process.env.XIRSYS_API_SECRET;     // Your Xirsys API secret
const SHEABA_IP = process.env.SHEABA_IP_TO_FILTER;

export const getIceServers = async (req, res, next) => {
    try {
        const ip = RequestIp.getClientIp(req);
        console.log(`Incoming IP address is: ${ip}`);
        const onlyTcp = ip.includes(SHEABA_IP);

        // Authenticate with Xirsys to retrieve ICE servers
        const response = await axios.put(
            XIRSYS_BASE_URL,
            {},
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${XIRSYS_API_USERNAME}:${XIRSYS_API_SECRET}`).toString('base64')}`,
                },
            }
        );

        if (response.data && response.data.v) {
            const iceServers = onlyTcp
                ? response.data.v.iceServers.filter((server) =>
                      server.urls.some((url) => url.includes('transport=tcp'))
                  )
                : response.data.v.iceServers;

            res.json({ iceServers, onlyTcp });
        } else {
            res.status(500).json({ error: 'Failed to retrieve ICE servers from Xirsys.' });
        }
    } catch (err) {
        console.error('Error fetching ICE servers:', err);
        next(err);
    }
};
