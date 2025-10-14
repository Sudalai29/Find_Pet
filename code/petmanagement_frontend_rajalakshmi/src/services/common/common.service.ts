import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CommonService implements CanActivate {
  loginstatus: BehaviorSubject<boolean> = new BehaviorSubject(false);
  requestcondition: any = { url: '', token: '' };

  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private httpClient: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ==============================
  // ✅ Route Guard
  // ==============================
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    let loggedin = false;

    if (isPlatformBrowser(this.platformId)) {
      loggedin =
        sessionStorage?.getItem('loginstatus') === 'true' &&
        !!sessionStorage?.getItem('key');
    }

    if (loggedin) {
      return true;
    } else {
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/signin']);
      }
      return false;
    }
  }

  // ==============================
  // ✅ Navigation Helpers
  // ==============================
  redirectTo(path: string) {
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigateByUrl(path);
    }
  }

  // ==============================
  // ✅ Toast Notifications
  // ==============================
  alert(status: string, alertmsg: string) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.toastrService.clear();
    const timeout = { timeOut: 5000 };
    switch (status.toLowerCase()) {
      case 'success':
        this.toastrService.success(alertmsg, 'Success', timeout);
        break;
      case 'error':
        this.toastrService.error(alertmsg, 'Error', timeout);
        break;
      default:
        this.toastrService.info(alertmsg, 'Info', timeout);
    }
  }

  // ==============================
  // ✅ Error Handling
  // ==============================
  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Unknown error!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => errorMessage);
  };

  // ==============================
  // ✅ Response Data Extractor
  // ==============================
  private extractData = (res: any) => {
    if (isPlatformBrowser(this.platformId) && !res.status && res.statusCode === 700) {
      sessionStorage.clear();
      window.location.assign('/');
      return {};
    } else {
      return res || {};
    }
  };

  // ==============================
  // ✅ POST Request (JSON)
  // ==============================
  public postRequest(url: string, requestData: any) {
    return new Promise((resolve, _reject) => {
      let bearertoken = '';
      if (isPlatformBrowser(this.platformId)) {
        bearertoken = sessionStorage.getItem('key') || '';
      }

      if (this.requestcondition.url === url) {
        resolve({ status: false, message: 'Your request is already in process' });
        return;
      }

      this.requestcondition.token = bearertoken;
      this.requestcondition.url = url;

      const headers = new HttpHeaders()
        .set('cache-control', 'no-cache')
        .set('content-type', 'application/json')
        .set('authorization', 'Bearer ' + bearertoken);

      this.httpClient
        .post(environment.apiUrl + url, requestData, { headers })
        .pipe(
          map(this.extractData),
          catchError(this.handleError)
        )
        .subscribe((res: any) => {
          this.requestcondition.url = '';
          if (res.logoutstatus && isPlatformBrowser(this.platformId)) {
            sessionStorage.clear();
            this.alert('error', 'Your login session has expired. Please re-login.');
            this.redirectTo('/signin');
          } else {
            resolve(res);
          }
        });
    });
  }

  // ==============================
  // ✅ POST Request (File Upload)
  // ==============================
  public postFileRequest(url: string, requestData: any) {
    return new Promise((resolve, _reject) => {
      let bearertoken = '';
      if (isPlatformBrowser(this.platformId)) {
        bearertoken = sessionStorage.getItem('key') || '';
      }

      const headers = new HttpHeaders()
        .set('cache-control', 'no-cache')
        .set('authorization', 'Bearer ' + bearertoken);

      this.httpClient
        .post<any>(environment.apiUrl + url, requestData, { headers })
        .pipe(
          map(this.extractData),
          catchError(this.handleError)
        )
        .subscribe((res: any) => {
          if (res.logoutstatus && isPlatformBrowser(this.platformId)) {
            sessionStorage.clear();
            this.alert('error', 'Your login session has expired. Please re-login.');
            this.redirectTo('/signin');
          } else {
            resolve(res);
          }
        });
    });
  }

  // ==============================
  // ✅ GET Request
  // ==============================
  public getRequest(url: string) {
    return new Promise((resolve, _reject) => {
      let bearertoken = '';
      if (isPlatformBrowser(this.platformId)) {
        bearertoken = sessionStorage.getItem('key') || '';
      }

      const headers = new HttpHeaders()
        .set('cache-control', 'no-cache')
        .set('content-type', 'application/json')
        .set('authorization', 'Bearer ' + bearertoken);

      this.httpClient
        .get(environment.apiUrl + url, { headers })
        .pipe(
          map(this.extractData),
          catchError(this.handleError)
        )
        .subscribe((res: any) => {
          if (res.logoutstatus && isPlatformBrowser(this.platformId)) {
            sessionStorage.clear();
            this.alert('error', 'Your login session has expired. Please re-login.');
            this.redirectTo('/signin');
          } else {
            resolve(res);
          }
        });
    });
  }
}

