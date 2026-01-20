export class LoginResponseDto {
  access_token: string;
  agent: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}
