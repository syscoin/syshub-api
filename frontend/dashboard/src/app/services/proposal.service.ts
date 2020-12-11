import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError} from "rxjs/operators";
import {throwError} from "rxjs";
import {environment as env} from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProposalService {

  constructor(private http: HttpClient) {
  }

  getAll() {
    return this.http.get(`${env.apiBase}/proposal/hiddenproposal/all`, {
      headers: {
        "appclient": "sysnode-info"
      }
    }).pipe(catchError((e) => throwError(e)))
  }

  create(hash: string) {
    return this.http.post(`${env.apiBase}/proposal/hiddenproposal`, {hash:hash},{
      headers: {
        "appclient": "sysnode-info"
      }
    }).pipe(catchError((e) => throwError(e)))
  }

  destroy(id: string) {
    return this.http.delete(`${env.apiBase}/proposal/hiddenproposal/${id}`,{
      headers: {
        "appclient": "sysnode-info"
      }
    }).pipe(catchError((e) => throwError(e)))
  }
}
