export default {
	API_KEYS: process.env.API_KEYS,
	APP_FRIENDLY_NAME: 'Tic-tac-toe API',
	ID_LENGTH: Number(process.env.ID_LENGTH) || 5,
	IS_PRODUCTION: process.env.NODE_ENV === 'production',
	PORT: process.env.PORT || 3000
};
