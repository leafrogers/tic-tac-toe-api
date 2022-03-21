import nock from 'nock';
import supertest from 'supertest';
import app from './app.js';
import config from '../config.js';

const request = supertest(app);


describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeAll(() => {
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	});

	afterAll(() => {
		nock.enableNetConnect();
	});



});
