// eslint-disable-next-line node/no-extraneous-import
import { jest } from '@jest/globals';
import nock from 'nock';
import supertest from 'supertest';
import config from '../config.js';
import app from './app.js';

const requestWithApiKey = supertest.agent(app);

requestWithApiKey.set('API-Key', 'test-key');

const requestWithNoApiKey = supertest.agent(app);
const requestWithBadApiKey = supertest.agent(app);

requestWithBadApiKey.set('API-Key', 'beep-boop');

jest.spyOn(global.console, 'info').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

describe(`The ${config.APP_FRIENDLY_NAME} app`, () => {
	beforeAll(() => {
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	describe('Authentication and authorization', () => {
		it('doesn’t allow calls that omit an API key', async () => {
			const { status } = await requestWithNoApiKey.post('/api/games');
			expect(status).toBe(401);
		});

		it('doesn’t allow calls that include a bad API key', async () => {
			const { status } = await requestWithBadApiKey.post('/api/games');
			expect(status).toBe(403);
		});
	});


});
