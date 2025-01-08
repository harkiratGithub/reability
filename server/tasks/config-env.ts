// https://medium.com/@mjangid/environment-variables-with-angular-cli-4cdbb96017f6
import { writeFile } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const production = true;
const port = 443;
const secret = process.env.SECRET_KEY;
const signalingServer = process.env.SIGNALING_SERVER;
const recaptchaKey = process.env.CAPTCHA_CLIENT_KEY;
const signalingServerUrl = process.env.SIGNALING_SERVER_URL;

const targetPath = `./client/src/environments/environment.prod.ts`;
const envConfigFile = `
export const environment = {
    production: ${production},
    secretKey: '${secret}',
    signalingServerPort:${port},
    signalingServer:'${signalingServer}',
    signalingServerUrl: '${signalingServerUrl}',
    recaptchaKey: '${recaptchaKey}',
    serverUrl: ''
  };`;
writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.warn(err);
  }
});
