# Reability

## Requirements

opengl - for gpu support must be installed on computer

on ubutnu:
run following commands:

1. sudo add-apt-repository ppa:ubuntu-x-swat/updates
2. sudo apt-get dist-upgrade
3. sudo apt install mesa-utils
4. glxinfo | grep "OpenGL version"

## Project Setup

make sure you are using the correct node version!!! (12.18.2)
npm i
cd client npm i
cd ..
npm run db:init:dev (creating the database as well as running init migrations)
npm run seed:dev (creating dummy user and dummy admin)

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Running Separated Client and Server

Each command should be in a separated workspace:
npm run start:client
npm run start:server

## Running Client and Server on the same terminal (not recommended)

npm run start:development
this will not track changes in client side and not make build on any client code change.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
Close
