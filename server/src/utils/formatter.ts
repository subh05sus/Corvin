import { randomUUID } from "crypto";

class Formatter {
  public formatError = (error: any): any => {
    const status = error.status || 500;
    const message = error.message || "Something went wrong";
    const code = error.code || "E500";
    const data = error.data || null;
    const success = false;
    const description =
      error.description || "Unexpected Error occurred Try Again!";
    console.log(error);
    return {
      status,
      message,
      data,
      success,
      code,
      description,
    };
  };

  public formatResponse = (
    result: any,
    message?: string,
    description?: string
  ): any => {
    let data: any = null;
    let success = false;
    const code = "S200";

    data = result;
    success = true;

    const response = {
      data,
      message: message ? message : "",
      success,
      code,
    };
    console.log(response);
    return response;
  };
}

export default Formatter;
