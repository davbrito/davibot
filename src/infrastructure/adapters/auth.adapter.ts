import { IAuthService } from "$application/services/auth.service.ts";

export class AuthServiceAdapter implements IAuthService {
  constructor(private readonly secret: string) {}

  verify(secret: string): boolean {
    return secret === this.secret;
  }
}
