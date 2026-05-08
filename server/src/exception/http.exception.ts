import { ErrorParams } from "../interface/error.interface";

export class HttpException extends Error {
  public status: number = 500;
  public message: string = "Something went wrong";
  public code: string = "E500";
  public data: any = null;
  public success: boolean = false;
  public description: string = "Unexpected Error occurred Try Again!";
  constructor(params: ErrorParams) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.message = params.message;
    this.data = params.data;
    this.description = params.description;
  }
}
