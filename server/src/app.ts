import fastify, {
  FastifyInstance,
  FastifyListenOptions,
  FastifyServerOptions,
} from "fastify";
import Autoload from "@fastify/autoload";
import path from "path";
import cors from "@fastify/cors";
import { fastifyMultipart } from "@fastify/multipart";
import { fmt } from "./config";
import fastifySwagger from "@fastify/swagger";
import fastifyView from "@fastify/view";
import { swaggerConfig, swaggerUiConfig } from "./config/swagger.config";

/* eslint-disable-next-line no-unused-vars */
type ListenCallbackFunction = (error: Error | null, address: string) => void;
type Context = { [key in string]: any };

class App {
  private fastifyInstance: FastifyInstance;
  constructor(opts: FastifyServerOptions, context?: Context) {
    this.fastifyInstance = fastify(opts);
    this.initializeSwagger();
    this.initializeErrorHandler();
    this.initializePreHandlers();
    this.initializePlugins(); 
    this.initializeRoutes();
    this.initializeViews();
  }

  public get log() {
    return this.fastifyInstance.log;
  }

  private initializeErrorHandler() {
    /* eslint-disable-next-line no-unused-vars */
    this.fastifyInstance.setErrorHandler((error, request, reply) => {
      // logger.info({ error: error.stack || error });
      const errorFormatted = fmt.formatError(error);
      console.log(errorFormatted, "Formatted Error!");
      const { status, ...errorResponse } = errorFormatted;
      reply.status(status).send(errorResponse);
    });
  }

  private initializeRoutes() {
    this.fastifyInstance.register(Autoload, {
      options: {
        prefix: "/v2/api",
      },
      dir: path.join(__dirname, 'apis'),
    });
  }

  
  private initializePlugins() {
    this.fastifyInstance.register(Autoload, {
      dir: path.join(__dirname, 'plugins'),
      // options: { /* pass options to plugins here if needed */ }
    });
  }


  private initializeViews() {
    // In production (build directory), views will be at build/src/views
    // In development, views will be at src/views
    const viewsPath = path.join(__dirname, 'views');
    const fallbackViewsPath = path.join(process.cwd(), 'src', 'views');
    const fs = require('fs');
    const viewsRoot = fs.existsSync(viewsPath) ? viewsPath : fallbackViewsPath;
    
    this.fastifyInstance.register(fastifyView, {
      engine: {
        ejs: require('ejs'),
      },
      root: viewsRoot,
      viewExt: 'ejs',
    });
  }
  
  private initializePreHandlers() {
    this.fastifyInstance.register(fastifyMultipart, {
      attachFieldsToBody: 'keyValues',
    });
    this.fastifyInstance.register(cors, {
      origin: '*',
      credentials: true,
    });
  }

  public getFastifyInstance() {
    return this.fastifyInstance;
  }

  private initializeSwagger() {
    // generateUsageCsv()
    this.fastifyInstance.register(fastifySwagger, swaggerConfig);
    this.fastifyInstance.register(require('@fastify/swagger-ui'), {
      ...swaggerUiConfig,
      prefix: '/v2/api/docs',
    });
  }



  public listen(opts: FastifyListenOptions, callback: ListenCallbackFunction) {
    this.fastifyInstance.listen(opts, callback);
  }

}

export default App;