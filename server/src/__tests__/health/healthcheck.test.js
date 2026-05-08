afterAll(() => {
	fastify.close();
});

describe('Server Check', () => {
	it('check health endpoint', async () => {
		const response = await fastify.inject({
			method: 'GET',
			url: '/health',
		});
		expect(response.statusCode).toEqual(200);
		const payload = response.json();
		expect(payload).toHaveProperty('success');
		expect(payload.success).toEqual(true);
	});
});
