const { default: App } = require('../../build/src/app');

class FastifyEnvironment {
	async setup() {
		await super.setup();
		const fastify = new App({ logger: false });
		this.global.fastify = fastify.getFastifyInstance();
	}
}

module.exports = FastifyEnvironment;
