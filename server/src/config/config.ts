type Environments = "development" | "production";
class Config {
  public env: Environments;
  public port: number;
  public redis_url: string;
  public redis_host: string;
  public redis_username: string;
  public redis_password: string;
  public redis_port: number;
  public gemini_api_key: string;
  public minimum_cli_version: string;

  constructor(env: NodeJS.ProcessEnv) {
    this.env = (env.NODE_ENV as Environments) || "development";
    this.port = this.getNumberValue(env.PORT) || 3000;
    this.redis_url = env.REDIS_URL?.trim() || "";
    this.redis_host = this.getStringValue(env.REDIS_HOST) || "localhost";
    this.redis_username = this.getStringValue(env.REDIS_USERNAME) || "";
    this.redis_password = this.getStringValue(env.REDIS_PASSWORD) || "";
    this.redis_port = this.getNumberValue(env.REDIS_PORT) || 6379;
    this.gemini_api_key = this.getStringValue(env.GEMINI_API_KEY);
    this.minimum_cli_version = this.getStringValue(env.MINIMUM_CLI_VERSION) || "1.0.12";

    // Validate required configs
    if (!this.gemini_api_key) {
      throw new Error("GEMINI_API_KEY is required");
    }
  }

  private getNumberValue(value: string | undefined) {
    return Number(value);
  }
  private getStringValue(value: string | undefined) {
    return String(value);
  }
}

export default Config;
