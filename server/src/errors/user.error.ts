export class UserError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string | undefined) {
      super(message);
      // name is set to the name of the class
      this.name = this.constructor.name;
      this.status = status;
      this.code = code;
    }
}