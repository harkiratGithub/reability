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
const gameIdWithComp = process.env.GAMEID_WITH_COMP_ACTIVE;
const redCmeraFlag = process.env.RED_CAMERA_FLAG;
const tncFlag = process.env.TERM_AND_COND_FLAG;
const scorePopupFlag = process.env.SCORE_POPUP_FLAG;
const rtmPopupFlag = process.env.RTM_POPUP_FLAG;
const carouselTextFlag = process.env.CAROUSEL_TEXT_FLAG;
const targetPath = `./client/src/environments/environment.prod.ts`;
const envConfigFile = `
export const environment = {
    production: ${production},
    secretKey: '${secret}',
    signalingServerPort: ${port},
    signalingServer: '${signalingServer}',
    signalingServerUrl: '${signalingServerUrl}',
    recaptchaKey: '${recaptchaKey}',
    serverUrl: '',
    gameIdWithComp: ${gameIdWithComp},
    redCmeraFlag: ${redCmeraFlag},
    tncFlag: ${tncFlag},
    scorePopupFlag: ${scorePopupFlag},
    rtmPopupFlag: ${rtmPopupFlag},
    carouselTextFlag: ${carouselTextFlag},
  };`;
writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.warn(err);
  }
});
