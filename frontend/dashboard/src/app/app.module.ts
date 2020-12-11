import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AddHashComponent} from './components/add-hash/add-hash.component';
import {NavbarComponent} from './views/layouts/navbar/navbar.component';
import {HomeComponent} from './views/home/home.component';
import {InformationComponent} from './views/information/information.component';
import {ReactiveFormsModule} from "@angular/forms";
import {HttpClientModule} from "@angular/common/http";
import { LoginComponent } from './views/login/login.component';
import { LogoComponent } from './components/logo/logo.component';
import { ListHashComponent } from './components/list-hash/list-hash.component';
import { LoadingComponent } from './components/loading/loading.component';
import {MatSnackBarModule} from '@angular/material/snack-bar';
@NgModule({
  declarations: [
    AppComponent,
    AddHashComponent,
    NavbarComponent,
    HomeComponent,
    InformationComponent,
    LoginComponent,
    LogoComponent,
    ListHashComponent,
    LoadingComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
