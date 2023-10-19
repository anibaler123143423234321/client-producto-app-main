import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@app/guards/auth/auth.guard';

const routes: Routes = [
  {
    path: "list",
    loadChildren: () => import("./pages/user-list/user-list.module").then(m=>m.UserListModule),
    canActivate: [AuthGuard]
  },
  {
    path: "rol",
    loadChildren: () => import("./pages/user-rol/user-rol.module").then(m=>m.UserRolModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: 'list'
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
