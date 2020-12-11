import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {AuthService} from "../../services/auth.service";
import swal from 'sweetalert2'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  userInput: AbstractControl;
  passInput: AbstractControl;
  showLoginError: boolean;
  loginErrorTimeout: number | undefined;
  loginErrorMs: number;

  constructor(private authService: AuthService, private router: Router) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required])
    });
    // @ts-ignore
    this.userInput = this.loginForm.get('email');
    // @ts-ignore
    this.passInput = this.loginForm.get('password');
    this.showLoginError = false;
    this.loginErrorMs = 2500;
  }

  ngOnInit(): void {
    clearTimeout(this.loginErrorTimeout);
  }

  onSubmit() {
    this.authService.login(this.userInput.value, this.passInput.value).subscribe(res => {
      // @ts-ignore
      this.authService.saveToken(res[`token`]);
      this.router.navigate(['/dashboard'])
    }, error => {
      console.log(error)
      this.showLoginError = true;
      this.loginErrorTimeout = setTimeout(() => {
        this.showLoginError = false;
      }, this.loginErrorMs);
    })
  }

  // this.authService.login(this.userInput.value, this.passInput.value).subscribe(res => {
  //   this.authService.role = res[`role`];
  //   if (res == null) return swal.fire('!Error', 'Usuario Inexistente', 'error').then(() => {
  //     this.loginForm.reset();
  //     // return this.router.navigateByUrl('/');
  //   });
  //   this.authService.saveToken(res[`token`]);
  //   if (res[`role`] === 'superadmin' || res[`role`] === 'operator') {
  //     swal.fire('!Panel Admin', 'Bienvenido', 'success');
  //     return this.router.navigateByUrl('/admin/dashboard');
  //   } else {
  //     swal.fire('Error', 'No puedes Acceder', 'error').then(() => {
  //       this.authService.logout();
  //       this.loginForm.reset();
  //       // return this.router.navigateByUrl('/');
  //     })
  //   }
  // }, error => {
  //   console.log(error)
  // });

}
