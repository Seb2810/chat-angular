import { Routes } from '@angular/router';
import { UserComponent  } from './user/user.component';
import { UpdateComponent } from './update/update.component';
import { authGuard } from './auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { ForgetpswdComponent } from './forgetpswd/forgetpswd.component';
import { ModifyComponent } from './modify/modify.component';
import { UploadComponent } from './upload/upload.component';
import { ShowComponent } from './show/show.component';
import { BoardComponent } from './board/board.component';
import { InterestComponent } from './interest/interest.component';
import { InfoUpdateComponent } from './info-update/info-update.component';
import { UserboardComponent } from './userboard/userboard.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  {
    path: 'update/:id',
    component: UpdateComponent,
    canActivate: [authGuard]
  },
  {
    path: 'test',
    component: UserComponent
  },
    {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'users',
    component: UserComponent,
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN'] }
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'register',
    component: RegisterComponent,
  },

    {
    path: 'forgetpswd',
    component: ForgetpswdComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN'] }
  },

      {
    path: 'chat',
    component: ChatComponent,
    canActivate: [authGuard],
  },

   {
    path: 'modify',
    component: ModifyComponent,
    canActivate: [authGuard],
  },

     {
    path: 'upload',
    component: UploadComponent,
    canActivate: [authGuard],
  },

      {
    path: 'show',
    component: ShowComponent,
    canActivate: [authGuard],
  },
        {
    path: 'board',
    component: BoardComponent,
    canActivate: [authGuard],
  },
{
      path: 'interest',
    component: InterestComponent,
    canActivate: [authGuard],
  },
  {
      path: 'info-update',
    component: InfoUpdateComponent,
    canActivate: [authGuard],
  },

    {
      path: 'userboard',
    component: UserboardComponent,
    canActivate: [authGuard],
  },
      {
      path: 'profile/:id',
    component: ProfileComponent,
    canActivate: [authGuard],
  },

    {
    path: '',
    component: HomeComponent
  },

];
