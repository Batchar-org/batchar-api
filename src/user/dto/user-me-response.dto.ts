import { User } from '../entities/user.entity';

export class UserMeResponse {
  id: number;

  email: string;

  name: string;

  address: string;

  profileImageUrl: string | null;

  fertility: number;

  static from(user: User): UserMeResponse {
    const res = new UserMeResponse();
    res.id = user.id;
    res.email = user.email;
    res.name = user.name;
    res.address = user.address;
    res.profileImageUrl = user.profileImageUrl;
    res.fertility = Number(user.fertility);
    return res;
  }
}
