import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {throwError} from "rxjs";
import {catchError} from "rxjs/operators";
import {environment as env} from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {
  }

  login(email: any, password: any) {
    return this.http.post(`${env.apiBase}/auth/login`, {email, password}, {
      headers: {
        "appclient": "sysnode-info"
      }
    }).pipe(catchError((e) => throwError(e)))
  }

  saveToken(token: string) {
    localStorage.setItem("session", token);
  }

  loadSession(): string {
    return <string>localStorage.getItem("session");
  }

  logout() {
    localStorage.removeItem("session");
  }


}
