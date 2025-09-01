export interface IAuthService {
  verify(secret: string): boolean;
}
