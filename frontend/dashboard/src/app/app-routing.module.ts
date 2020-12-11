import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {HomeComponent} from "./views/home/home.component";
import {LoginComponent} from "./views/login/login.component";
import {AuthenticatedGuard} from "./guards/authenticated.guard";
import {AddHashComponent} from "./components/add-hash/add-hash.component";
import {InformationComponent} from "./views/information/information.component";

const routes: Routes = [
  {path: '', component: LoginComponent, pathMatch: 'full'},
  {path: 'login', component: LoginComponent,},
  {
    path: 'dashboard',
    component: HomeComponent,
    canActivateChild: [AuthenticatedGuard],
    // children: [
    //   // {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
    //   {path: 'add', component: AddHashComponent},
    //   {path: 'info', component: InformationComponent}
    // ]
  },
  {path: '**', component: LoginComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
