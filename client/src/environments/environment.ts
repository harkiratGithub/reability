// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
const MY_IP = '192.168.4.132';
//const MY_IP = '192.168.50.40'; // EREZ Office ip
// const MY_IP = '192.168.50.68'; // UZI Office ip
//const MY_IP = '192.168.0.51'; // UZI HOME
//const MY_IP = '192.168.43.245'; // UZI CELLPHONE

export const environment = {
  production: false,
  port: 8080,
  signalingServerUrl: `https://${MY_IP}:3001`,
  signalingServer: MY_IP,
  signalingServerPort: 3001,
  serverUrl: `https://${MY_IP}:8080`,
  secretKey: 'gertner-little-secret',
  recaptchaKey: '6Lc8yKspAAAAAAQ6ItzKFYZ-uJ5GG2PdWGtHZwhM',
  // recaptchaKey: '6Lc-udQZAAAAAIkxjUJNnu5xTV8Fcdq_xlqXcmiZ',
};
